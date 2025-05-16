from playwright.sync_api import Page, expect

def verificar_tooltips(page: Page, contexto: str):
    info_icons = page.locator("[aria-label='Información adicional']")
    icon_count = info_icons.count()
    assert icon_count >= 1, f"[{contexto}] No se encontraron íconos con aria-label='Información adicional'. Detectados: {icon_count}"

    tooltip_count = 0

    for i in range(icon_count):
        icon = info_icons.nth(i)
        icon.hover()
        page.wait_for_timeout(300)

        tooltips = page.locator("[role='tooltip']")
        if tooltips.count() > 0:
            tooltip_count += 1
            print(f"[{contexto}] Tooltip visible sobre ícono #{i+1}")
        else:
            print(f"[{contexto}] Tooltip NO visible sobre ícono #{i+1}")

    assert tooltip_count == icon_count, f"[{contexto}] Se esperaban {icon_count} tooltips, pero se mostraron {tooltip_count}"


def test_tooltips_en_clima_y_generacion_solar(page: Page):
    page.goto("http://localhost:5173")
    page.wait_for_timeout(2000)

    page.get_by_role("heading", name="Clima").click()
    expect(page.get_by_text("Temperatura y Viento")).to_be_visible(timeout=30000)
    verificar_tooltips(page, "Clima")

    page.locator("button.tab-button", has_text="Generación Solar").click()

    expect(page.get_by_text("Estimación de Generación Solar")).to_be_visible(timeout=10000)
    verificar_tooltips(page, "Generación Solar")
