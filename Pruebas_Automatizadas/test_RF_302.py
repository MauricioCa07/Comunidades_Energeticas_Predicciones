import re
from playwright.sync_api import Page, expect

def test_has_title(page: Page):
    page.goto("http://localhost:5173")
    
    page.get_by_role("heading", name="Energía").click()
    expect(page.get_by_text("Predicción Promedio (Próximas 24h)")).to_be_visible(timeout=20000)
    
    with page.expect_download() as download_file:
        page.locator("button.export-button").click()
    
    download = download_file.value 
    filename = download.suggested_filename
    
    try:
        extension = filename.split(".")[-1]
        assert extension == "xlsx"
    except AssertionError:
        print(f"Error: El archivo exportado es '{filename}', pero se esperaba formato XLSX.")
        raise


