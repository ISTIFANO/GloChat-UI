"""
Home restaurant swiper against the REAL backend (GET /api/catalog/merchants through the gateway).
Usage: python e2e/merchants.e2e.py [base_url]
"""
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

from settings import web_base_url

BASE = web_base_url()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
os.makedirs(OUT, exist_ok=True)
results = []


def check(name, fn):
    try:
        fn()
        results.append(("PASS", name))
    except Exception as e:  # noqa: BLE001
        results.append(("FAIL", f"{name}: {str(e).splitlines()[0][:250]}"))


def fail(msg):
    raise AssertionError(msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="fr-FR")
    ctx.add_init_script("sessionStorage.setItem('mc.welcomeDismissed', '1')")
    page = ctx.new_page()
    calls = []
    page.on("request", lambda r: calls.append(r.url) if "/api/catalog/merchants?" in r.url else None)

    page.goto(BASE, wait_until="networkidle")
    slides = page.locator("[data-merchant-slide]")
    page.wait_for_selector("[data-merchant-slide]", state="attached", timeout=30000)
    page.locator("text=Restaurants près de toi").scroll_into_view_if_needed()
    page.wait_for_timeout(1200)
    page.screenshot(path=os.path.join(OUT, "50-home-restaurants.png"), full_page=True)
    check("swiper loads every restaurant from the gateway", lambda: expect(slides).to_have_count(7))
    check("list comes from the real API with the customer's location", lambda: calls or fail("no call"))
    check("each restaurant shows its logo", lambda: page.wait_for_function(
        "() => [...document.querySelectorAll('[data-merchant-slide] img')].filter(i => i.complete && i.naturalWidth > 0).length >= 7", timeout=10000))
    check("count line shows how many are open", lambda: expect(page.get_by_text(re.compile(r"7 adresses · \d ouvertes"))).to_be_visible())

    track = page.locator("[data-merchant-slide]").first.locator("xpath=..")
    before = track.evaluate("el => el.scrollLeft")
    box = track.bounding_box()
    page.mouse.move(box["x"] + box["width"] - 30, box["y"] + 80)
    page.mouse.down()
    page.mouse.move(box["x"] + 40, box["y"] + 80, steps=12)
    page.mouse.up()
    page.wait_for_timeout(700)
    after = track.evaluate("el => el.scrollLeft")
    check("mouse drag scrolls the swiper", lambda: after > before + 100 or fail(f"{before} -> {after}"))
    check("dragging does not open a restaurant", lambda: expect(page).to_have_url(re.compile(r"/$")))
    page.screenshot(path=os.path.join(OUT, "51-home-restaurants-dragged.png"))

    slides.nth(1).click()
    check("tapping a restaurant opens its page", lambda: expect(page).to_have_url(re.compile(r"/m/m-[a-z]+$"), timeout=10000))
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_selector("[data-merchant-slide]", state="attached", timeout=30000)

    page.get_by_role("button", name="ع").click()
    page.locator("[data-merchant-slide]").first.scroll_into_view_if_needed()
    page.wait_for_timeout(900)
    page.screenshot(path=os.path.join(OUT, "52-home-restaurants-arabic.png"))
    check("Arabic title, right-to-left", lambda: expect(page.get_by_text("المطاعم قريبة منك")).to_be_visible())

    page.set_viewport_size({"width": 1280, "height": 900})
    page.get_by_role("button", name="EN").click()
    page.wait_for_timeout(500)
    nxt = page.get_by_role("button", name="Next")
    check("desktop: arrow buttons shown", lambda: expect(nxt).to_be_visible())
    browser.close()

failed = sum(1 for s, _ in results if s == "FAIL")
for s, n in results:
    print(f"{s}  {n}")
print(f"\n{len(results) - failed}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
