import os
from PIL import Image, ImageDraw, ImageFont
import colorsys

def create_placeholder_image(title, filename, size=(800, 450)):
    # Créer une nouvelle image avec un fond
    image = Image.new('RGB', size, color='#1a1a1a')
    draw = ImageDraw.Draw(image)
    
    # Générer une couleur basée sur le titre
    hue = sum(ord(c) for c in title) % 360 / 360.0
    rgb = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(hue, 0.8, 0.8))
    
    # Dessiner un rectangle de couleur
    margin = 20
    draw.rectangle([margin, margin, size[0]-margin, size[1]-margin], 
                  outline=rgb, width=5)
    
    # Ajouter le titre du jeu
    title_font_size = 50
    try:
        font = ImageFont.truetype("arial.ttf", title_font_size)
    except:
        font = ImageFont.load_default()
    
    # Centrer le texte
    text_bbox = draw.textbbox((0, 0), title, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    text_x = (size[0] - text_width) // 2
    text_y = (size[1] - text_height) // 2
    
    # Dessiner le texte
    draw.text((text_x, text_y), title, font=font, fill=rgb)
    
    # Sauvegarder l'image
    os.makedirs("static/default_game_images", exist_ok=True)
    image.save(f"static/default_game_images/{filename}")

def create_all_default_images():
    games = {
        "Cyber Odyssey": "cyber_odyssey.jpg",
        "Galaxy Commander": "galaxy_commander.jpg",
        "Speed Demons": "speed_demons.jpg",
        "Mystic Lands": "mystic_lands.jpg"
    }
    
    for title, filename in games.items():
        create_placeholder_image(title, filename)

if __name__ == "__main__":
    create_all_default_images()
    print("✅ Images par défaut créées avec succès") 