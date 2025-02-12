import os
import re
from datetime import datetime
from urllib.parse import urljoin

# ✅ Define Your Website URL
BASE_URL = "https://xeve.ai"

# ✅ File Paths
ROUTER_FILE = os.path.join(os.getcwd(), "src", "router.js")  # Vue Router file
SITEMAP_FILE = os.path.join(os.getcwd(), "dist", "sitemap.xml")  # Output sitemap.xml

# ✅ Hardcoded Important Pages
STATIC_PAGES = [
    {"path": "/", "priority": "1.0", "changefreq": "monthly"},
    {"path": "/AI_girlfriends", "priority": "0.8", "changefreq": "monthly"},
    {"path": "/AI_girlfriend_video_chat", "priority": "0.8", "changefreq": "monthly"},
    {"path": "/AI_sexting", "priority": "0.8", "changefreq": "monthly"},
]

# ✅ Character Pages (Manually Defined)
CHARACTER_PAGES = [
    "goddessVenom", "skylarSweet", "brendaDixon", "laraWinters", "cassandra", "nahirRouge"
]


def extract_routes():
    """Extracts Vue.js routes dynamically from `router.js`."""
    routes = []

    try:
        with open(ROUTER_FILE, "r", encoding="utf-8") as file:
            content = file.read()

            # ✅ Regex to find routes: `path: '/example'`
            pattern = re.compile(r"path:\s*['\"](.*?)['\"]")
            matches = pattern.findall(content)

            for match in matches:
                if match and match != "/":
                    routes.append(match)

    except FileNotFoundError:
        print(f"❌ Error: {ROUTER_FILE} not found.")
        return []

    return routes


def generate_sitemap():
    """Generates a 100% correct `sitemap.xml` dynamically from Vue Router and static pages."""
    routes = extract_routes()
    all_routes = STATIC_PAGES + [{"path": f"/{char}", "priority": "0.7", "changefreq": "monthly"} for char in CHARACTER_PAGES]

    # ✅ Merge Extracted Routes
    for route in routes:
        if not any(p["path"] == route for p in all_routes):
            all_routes.append({"path": route, "priority": "0.5", "changefreq": "monthly"})

    lastmod = datetime.utcnow().strftime("%Y-%m-%d")

    # ✅ Start XML Sitemap
    sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    # ✅ Add all routes dynamically
    for page in all_routes:
        full_url = urljoin(BASE_URL, page["path"])
        sitemap_content += f"  <url>\n"
        sitemap_content += f"    <loc>{full_url}</loc>\n"
        sitemap_content += f"    <lastmod>{lastmod}</lastmod>\n"
        sitemap_content += f"    <changefreq>{page['changefreq']}</changefreq>\n"
        sitemap_content += f"    <priority>{page['priority']}</priority>\n"
        sitemap_content += f"  </url>\n"

    sitemap_content += "</urlset>"

    # ✅ Save to File
    os.makedirs(os.path.dirname(SITEMAP_FILE), exist_ok=True)  # Ensure `dist/` exists
    with open(SITEMAP_FILE, "w", encoding="utf-8") as file:
        file.write(sitemap_content)

    print(f"✅ Sitemap generated successfully at {SITEMAP_FILE}")


if __name__ == "__main__":
    print("🔄 Generating sitemap.xml ...")
    generate_sitemap()
