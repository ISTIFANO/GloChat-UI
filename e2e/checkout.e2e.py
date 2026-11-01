"""
Full purchase journey in a real browser against the REAL stack (no mock anywhere):
web app -> Keycloak login -> gateway -> commerce (cart, quote, order) -> payment-service -> Stripe test mode.

Usage:  python e2e/checkout.e2e.py [base_url]        (default http://localhost:4200)
The demo user's password is read from the backend's infra/.env (MARKETCHAT_ENV_FILE overrides the path).
Screenshots go to e2e/screenshots/ (git-ignored).
"""
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4200"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "screenshots")
ENV_FILE = os.environ.get("MARKETCHAT_ENV_FILE", os.path.join(HERE, "..", "..", "marketchat", "infra", ".env"))
os.makedirs(OUT, exist_ok=True)

PASSWORD = next(l.split("=", 1)[1].strip() for l in open(ENV_FILE, encoding="utf-8") if l.startswith("DEMO_USER_PASSWORD="))
results = []


def check(name, fn):
    try:
        fn()
        results.append(("PASS", name))
    except Exception as e:  # noqa: BLE001
        results.append(("FAIL", f"{name}: {str(e).splitlines()[0][:300]}"))


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name))


def search(page, text):
    page.goto(BASE)
    page.fill('input[name="q"]', text)
    page.get_by_role("button", name="Chercher").click()
    page.wait_for_selector("[data-card]", timeout=15000)


def open_sheet_and_add(page, product_name, choose=None):
    page.get_by_role("button", name=re.compile(rf"^(Choisir|Ajouter) {re.escape(product_name)}$")).first.click()
    page.wait_for_selector("footer button.btn-primary", timeout=15000)
    page.wait_for_timeout(500)
    for label in choose or []:
        page.locator("[role=dialog] button[aria-pressed]", has_text=label).first.click()
    page.locator("footer button.btn-primary").click()


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, locale="fr-FR")
    page = ctx.new_page()

    # 1) signed out: "Add" sends to Keycloak, then the add is replayed after login
    search(page, "double smash")
    open_sheet_and_add(page, "Double Smash Burger")
    page.wait_for_url(re.compile(r"localhost:8180/realms/marketchat/"), timeout=20000)
    shot(page, "10-keycloak-login.png")
    check("tapping Add while signed out opens the Keycloak login", lambda: expect(page.locator("#username")).to_be_visible())
    page.fill("#username", "demo@marketchat.local")
    page.fill("#password", PASSWORD)
    page.locator("#kc-login").click()
    page.wait_for_url(re.compile(re.escape(BASE) + r"/?(\?.*)?$"), timeout=20000)
    check("after login the pending add lands in the cart (badge)", lambda: expect(page.locator("[data-cart-count]")).to_have_text(re.compile(r"^[1-9]\d*$"), timeout=15000))
    check("account avatar shown", lambda: expect(page.locator("[data-account]")).to_be_visible())

    # start from a known cart: exactly 1 Double Smash
    page.goto(BASE + "/cart")
    page.wait_for_selector("[data-cart-line]", timeout=15000)
    if page.locator("[data-cart-line]").count() > 1 or "2" in (page.locator("[data-cart-count]").inner_text() or ""):
        page.get_by_role("button", name="Vider").click()
        page.wait_for_timeout(800)
        search(page, "double smash")
        open_sheet_and_add(page, "Double Smash Burger")
        page.wait_for_timeout(1500)

    # 2) signed in: fly-to-cart + merged badge
    search(page, "frites")
    open_sheet_and_add(page, "Frites maison")
    page.wait_for_timeout(350)
    shot(page, "11-fly-to-cart.png")
    page.wait_for_timeout(1200)
    check("fly to cart: badge counts 2 items", lambda: expect(page.locator("[data-cart-count]")).to_have_text("2", timeout=10000))

    # 3) another merchant -> conflict prompt, keep the cart
    search(page, "california")
    open_sheet_and_add(page, "California saumon avocat (8)")
    page.wait_for_selector("[role=alertdialog]", timeout=10000)
    shot(page, "12-merchant-conflict.png")
    check("other merchant: conflict prompt names the current merchant", lambda: expect(page.locator("[role=alertdialog]")).to_contain_text("Smash Lab Agdal"))
    page.get_by_role("button", name="Garder mon panier").click()
    page.keyboard.press("Escape")
    page.goto(BASE + "/cart")

    # 4) cart: address + cash, then checkout
    page.wait_for_selector("[data-cart-line]", timeout=15000)
    if page.get_by_role("button", name="Changer").count() == 0:
        page.fill('input[name="line"]', "12 avenue de France, 3e étage")
        page.fill('input[name="label"]', "Maison")
        page.get_by_role("radio", name=re.compile("Agdal")).click()
        page.get_by_role("button", name="Livrer ici").click()
        page.wait_for_timeout(1000)
    page.get_by_role("radio", name=re.compile("Espèces")).click()
    page.wait_for_timeout(900)
    shot(page, "13-cart.png")
    check("cart shows the delivery fee from the backend", lambda: expect(page.get_by_text("Frais de livraison")).to_be_visible())
    cta = page.get_by_role("button", name=re.compile(r"^Commander · "))
    check("cart ready: order button enabled", lambda: expect(cta).to_be_enabled(timeout=10000))
    cta.click()
    page.wait_for_url(re.compile(r"/checkout$"), timeout=15000)
    page.wait_for_timeout(900)
    shot(page, "14-checkout.png")
    check("checkout shows the price-lock countdown", lambda: expect(page.get_by_role("timer")).to_contain_text("Prix garantis"))
    page.get_by_role("button", name=re.compile(r"^Confirmer la commande")).click()
    page.wait_for_url(re.compile(r"/orders/MC-\d{2}-\d{6}"), timeout=20000)
    page.wait_for_timeout(500)
    shot(page, "15-order-placed-cash.png")
    cash_url = page.url
    check("cash order confirmed", lambda: expect(page.locator("[data-status]")).to_have_text("Commande confirmée"))
    check("cart emptied after the order", lambda: expect(page.locator("[data-cart-count]")).to_have_count(0, timeout=10000))

    # 5) card: Stripe hosted checkout with the 4242 test card
    search(page, "double smash")
    open_sheet_and_add(page, "Double Smash Burger", choose=["Large"])
    page.wait_for_timeout(1500)
    page.goto(BASE + "/cart")
    page.wait_for_selector("[data-cart-line]", timeout=15000)
    if page.get_by_role("button", name="Changer").count() == 0:
        page.get_by_role("button", name=re.compile(r"Maison")).first.click()
        page.wait_for_timeout(900)
    page.get_by_role("radio", name=re.compile("Carte bancaire")).click()
    page.wait_for_timeout(900)
    page.get_by_role("button", name=re.compile(r"^Commander · ")).click()
    page.wait_for_url(re.compile(r"/checkout$"), timeout=15000)
    page.get_by_role("button", name=re.compile(r"^Payer .* par carte")).click()
    page.wait_for_url(re.compile(r"checkout\.stripe\.com"), timeout=30000)
    page.wait_for_selector("#cardNumber", timeout=30000)
    page.wait_for_timeout(1500)
    shot(page, "16-stripe-checkout.png")
    check("redirected to the real Stripe Checkout page", lambda: expect(page.locator("#cardNumber")).to_be_visible())
    if page.locator("#email").count():
        page.fill("#email", "demo@marketchat.local")
    page.fill("#cardNumber", "4242 4242 4242 4242")
    page.fill("#cardExpiry", "12 / 34")
    page.fill("#cardCvc", "123")
    if page.locator("#billingName").count():
        page.fill("#billingName", "Demo MarketChat")
    if page.locator("#billingPostalCode").count() and page.locator("#billingPostalCode").is_visible():
        page.fill("#billingPostalCode", "10000")
    if page.locator("#enableStripePass").count() and page.locator("#enableStripePass").is_checked():
        page.locator("#enableStripePass").uncheck()
    page.locator("button[type=submit]").first.click()
    page.wait_for_url(re.compile(re.escape(BASE) + r"/orders/MC-\d{2}-\d{6}\?payment=success"), timeout=60000)
    page.wait_for_timeout(800)
    shot(page, "17-back-from-stripe.png")
    check("back from Stripe: payment verified server-side, order confirmed",
          lambda: expect(page.locator("[data-status]")).to_have_text("Commande confirmée", timeout=30000))
    check("order shows 'Payé par carte'", lambda: expect(page.get_by_text("Payé par carte")).to_be_visible(timeout=10000))
    page.wait_for_timeout(1500)
    shot(page, "18-order-paid-card.png")

    # 6) Arabic RTL order page + history + cancel the cash order
    page.get_by_role("button", name="ع").click()
    page.wait_for_timeout(700)
    shot(page, "19-order-arabic.png")
    check("order page in Arabic, right-to-left", lambda: expect(page.locator("html")).to_have_attribute("dir", "rtl"))
    page.get_by_role("button", name="FR").click()
    page.goto(BASE + "/orders")
    page.wait_for_selector("a[href^='/orders/MC-']", timeout=15000)
    page.wait_for_timeout(500)
    shot(page, "20-orders-history.png")
    check("history lists the orders", lambda: expect(page.locator("a[href^='/orders/MC-']").first).to_be_visible())
    page.goto(cash_url.split("?")[0])
    page.get_by_role("button", name="Annuler la commande").click()
    page.get_by_role("button", name="Oui, annuler").click()
    check("cash order can be canceled by the customer", lambda: expect(page.locator("[data-status]")).to_have_text("Annulée", timeout=10000))

    browser.close()

failed = 0
for status, name in results:
    print(f"{status}  {name}")
    failed += status == "FAIL"
print(f"\n{len(results) - failed}/{len(results)} checks passed")
print("screenshots:", OUT)
sys.exit(1 if failed else 0)
