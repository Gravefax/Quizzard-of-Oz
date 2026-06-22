project = "Quizzard of Oz"
copyright = "2026, Quizzard of Oz Team"
author = "Quizzard of Oz Team"

extensions = ["myst_parser"]

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

source_suffix = {
    ".md": "markdown",
}
root_doc = "index"

myst_enable_extensions = [
    "colon_fence",
    "deflist",
]

html_theme = "furo"
html_title = "Quizzard of Oz Docs"
html_static_path = ["_static"]
html_css_files = ["custom.css"]

html_theme_options = {
    "sidebar_hide_name": True,
    "light_css_variables": {
        "color-brand-primary": "#d9485f",
        "color-brand-content": "#b91c3d",
        "color-api-name": "#0f172a",
        "color-api-pre-name": "#f8fafc",
        "color-background-primary": "#fffaf7",
        "color-background-secondary": "#fff1ec",
        "color-foreground-primary": "#1f2937",
        "color-foreground-secondary": "#475569",
        "color-card-background": "#ffffff",
        "color-card-border": "#f1d6cf",
        "color-link": "#b91c3d",
        "color-link--hover": "#881337",
        "color-sidebar-background": "#fff7f3",
        "color-sidebar-link-text": "#334155",
        "color-sidebar-link-text--top-level": "#0f172a",
        "color-sidebar-item-background--hover": "#ffe7de",
    },
    "dark_css_variables": {
        "color-brand-primary": "#fb7185",
        "color-brand-content": "#fda4af",
        "color-background-primary": "#1b1a24",
        "color-background-secondary": "#231f2e",
        "color-foreground-primary": "#f8fafc",
        "color-foreground-secondary": "#cbd5e1",
        "color-card-background": "#262233",
        "color-card-border": "#453b57",
        "color-link": "#fda4af",
        "color-link--hover": "#fecdd3",
        "color-sidebar-background": "#17151f",
        "color-sidebar-link-text": "#cbd5e1",
        "color-sidebar-link-text--top-level": "#f8fafc",
        "color-sidebar-item-background--hover": "#2a2438",
    },
}
