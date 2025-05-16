import time
from playwright.sync_api import Page, expect

def test_chart_updates_quickly(page: Page):
    page.goto("http://localhost:5173")
    page.get_by_role("heading", name="Clima").click()
    page.wait_for_timeout(20000)  # Espera para que cargue todo

    input_interval = page.locator("#startIntervalInput")
    chart_svg = page.locator("svg.recharts-surface").first

    expect(chart_svg).to_be_visible(timeout=5000)
    initial_svg = chart_svg.inner_html()

    # Cambiar valor del input
    input_interval.fill("100")

    start_time = time.time()

    page.wait_for_function(
        """
        ([selector, initialHTML]) => {
            const el = document.querySelector(selector);
            return el && el.innerHTML !== initialHTML;
        }
        """,
        arg=["svg.recharts-surface", initial_svg],
        timeout=2000
    )

    elapsed = time.time() - start_time
    assert elapsed <= 2, f"La gráfica tardó más de 2s en actualizarse: {elapsed:.2f} s"
    print(f"La gráfica se actualizó en {elapsed:.2f} segundos.")
