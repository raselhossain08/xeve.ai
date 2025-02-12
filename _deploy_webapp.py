import json
import os
import shutil
import subprocess

available_videos_webpage_path = "public/available_videos.json"
available_videos_webapp_path_backup = "public/available_videos_backup.json"
available_videos_api_path = "../PersonAIAPI/video_metadata/v1/available_videos.json"
robots_path = "public/robots.txt"

def read_available_videos():
    """Reads character pages from available_videos.json or available_videos_nonprod.json"""
    json_paths = ["public/available_videos.json", "public/available_videos_nonprod.json"]
    for path in json_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as file:
                return json.load(file)
    return []

def deploy_webapp():
    """Deploy the web application with additional sitemap and Firebase steps."""
    
    subprocess.run(["gcloud", "config", "set", "account", 'personai@jhdev.org'], check=True)

    stage = input("Where should the Webapp be deployed? (prod/nonprod): ").strip()
    if stage not in ["prod", "nonprod"]:
        print("Invalid stage. Exiting...")
        return

    # ✅ Step 1: Generate Sitemap
    print("🔄 Generating sitemap.xml before deployment...")
    subprocess.run(["python", "generate_sitemap.py"], check=True)

    # ✅ Step 2: Build Vue.js Project
    print("🚀 Building Vue.js project...")
    subprocess.run(["npm", "run", "build"], check=True)

    # ✅ Step 3: Deploy to Firebase
    firebase_target = "hosting:prod" if stage == "prod" else "hosting:nonprod"
    print(f"🚀 Deploying to Firebase Hosting ({firebase_target})...")
    subprocess.run(["firebase", "deploy", "--only", firebase_target], check=True)

    print("✅ Deployment completed successfully!")

if __name__ == "__main__":
    available_videos = read_available_videos()
    print(f"Loaded {len(available_videos)} available videos.")
    deploy_webapp()
