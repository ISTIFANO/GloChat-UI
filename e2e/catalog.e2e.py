"""
End-to-end check of the web app against the REAL backend (gateway -> commerce-service -> PostgreSQL).
No mock: the products shown come from the database.

Usage:  python e2e/catalog.e2e.py [base_url]   (default http://localhost:4200)
Writes mobile screenshots to e2e/screenshots/.
"""
import os
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4200"
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

results = []


def check(name, fn):
    try:
        fn()
        results.append(("PASS", name))
    except Exception as e:  # noqa: BLE001
        results.append(("FAIL", f"{name}: {e}"))


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="fr-FR")
    page = ctx.new_page()
    api_calls = []
    page.on("request", lambda r: api_calls.append(r.url) if "/api/" in r.url else None)

    page.goto(BASE)
    page.wait_for_timeout(1200)  # hero animation
    page.screenshot(path=os.path.join(OUT, "01-home.png"))
    check("home shows hero and chips", lambda: expect(page.get_by_text("Tu as envie de quoi ?")).to_be_visible())

    # real search via the composer
    page.fill('input[name="q"]', "un burger sous 50")
    page.get_by_role("button", name="Chercher").click()
    page.wait_for_selector("[data-card]", timeout=15000)
    page.wait_for_timeout(900)  # cards animation
    page.screenshot(path=os.path.join(OUT, "02-results-burger.png"))
    check("search hit the gateway", lambda: [u for u in api_calls if u.endswith("/api/catalog/search")] or (_ for _ in ()).throw(AssertionError("no call")))
    check("results come from the database", lambda: expect(page.get_by_text("Classic Cheeseburger")).to_be_visible())
    check("budget 50 respected (65 MAD Double Smash excluded)", lambda: expect(page.get_by_text("Double Smash Burger")).to_have_count(0))

    # product sheet with real options
    page.fill('input[name="q"]', "double smash")
    page.get_by_role("button", name="Chercher").click()
    page.wait_for_selector("text=Double Smash Burger", timeout=15000)
    page.get_by_role("button", name="Choisir Double Smash Burger").click()
    page.wait_for_selector("text=Suppléments", timeout=15000)
    page.wait_for_timeout(800)
    check("sheet shows real option groups", lambda: expect(page.get_by_text("Accompagnement")).to_be_visible())
    page.get_by_role("button", name="Large").click()
    page.get_by_role("button", name="Bacon de dinde").click()
    page.wait_for_timeout(500)
    check("live price = 65 + 12 + 10 = 87", lambda: expect(page.get_by_role("button", name="Ajouter · 87 MAD")).to_be_visible())
    page.screenshot(path=os.path.join(OUT, "03-product-sheet.png"))
    page.get_by_role("button", name="Ajouter · 87 MAD").click()
    check("no fake cart success", lambda: expect(page.get_by_text("Le panier arrive")).to_be_visible())
    page.get_by_role("button", name="Fermer").click()
    page.wait_for_timeout(500)

    # Arabic + RTL
    page.get_by_role("button", name="ع").click()
    page.fill('input[name="q"]', "بغيت برغر")
    page.get_by_role("button", name="ابحث").click()
    page.wait_for_selector("[data-card]", timeout=15000)
    page.wait_for_timeout(900)
    page.screenshot(path=os.path.join(OUT, "04-arabic-rtl.png"))
    check("arabic is right-to-left", lambda: expect(page.locator("html")).to_have_attribute("dir", "rtl"))
    check("arabic search finds burgers", lambda: expect(page.get_by_text("Double Smash Burger")).to_be_visible())

    browser.close()

for status, name in results:
    print(f"{status}  {name}")
print()
failed = [r for r in results if r[0] == "FAIL"]
print("ALL WEB E2E CHECKS PASSED" if not failed else f"{len(failed)} CHECK(S) FAILED")
print(f"screenshots: {OUT}")
sys.exit(1 if failed else 0)
