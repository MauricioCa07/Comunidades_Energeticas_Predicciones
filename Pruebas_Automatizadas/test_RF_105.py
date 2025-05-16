import re
from playwright.sync_api import Page, expect

def test_has_title(page: Page):
    page.goto("http://localhost:5173")
    
    page.get_by_role("heading", name="Energía").click()
    page.wait_for_timeout(20000)
    rows = page.locator("table.prediction-table tbody tr")  

    expect(rows).to_have_count(8, timeout=5000)

    rows = page.locator("table.prediction-table tbody tr")
    expect(rows).to_have_count(8, timeout=5000)

    for i in range(8):
        cells = rows.nth(i).locator("td")
        time_str = cells.nth(0).inner_text().strip()
        value_str = cells.nth(1).inner_text().strip()

        assert re.fullmatch(r"\d{2}:\d{2}", time_str), f"Hora inválida en fila {i+1}: '{time_str}'"
        assert re.fullmatch(r"\d+\.\d{2}", value_str), f"Valor sin dos decimales en fila {i+1}: '{value_str}'"
        print(f"Fila {i+1}: Hora = {time_str}, Valor = {value_str}")