import os
import subprocess

# ✅ Step 1: Generate Sitemap
print("🔄 Generating sitemap.xml before deployment...")
subprocess.run(["python", "generate_sitemap.py"], check=True)

# ✅ Step 2: Build Vue.js Project
print("🚀 Building Vue.js project...")
subprocess.run(["npm", "run", "build"], check=True)

# ✅ Step 3: Deploy to Firebase
print("🚀 Deploying to Firebase Hosting...")
subprocess.run(["firebase", "deploy", "--only", "hosting:prod"], check=True)

print("✅ Deployment completed successfully!")
