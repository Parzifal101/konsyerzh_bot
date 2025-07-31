import numpy as np
import tensorflow as tf
import os
from tensorflow.keras.preprocessing import image
from pathlib import Path
import sys
sys.path.append('/home/kali/Desktop/konsyerzh_bot/app/')

# model =  tf.keras.models.load_model('room.keras')
# model3 =  tf.keras.models.load_model('room3layer.keras')
# Получаем путь к текущей папке скрипта
current_dir = Path(__file__).parent

# Загрузка с правильными путями
model = tf.keras.models.load_model(current_dir / 'room.keras')
model3 = tf.keras.models.load_model(current_dir / 'room3layer.keras')

def predict_image(img_path, mode):
    img = image.load_img(img_path, target_size=(150, 150))
    x = image.img_to_array(img)
    x = np.expand_dims(x, axis=0)
    x /= 255.

    if mode:
      prediction = model.predict(x)
    else:
      prediction = model3.predict(x)

    if prediction[0] > 0.5:
        print(f"{img_path} - **Современный  ремонт**",prediction[0])
    else:
        print(f"{img_path} - **Бабушкин ремонт**",prediction[0])

    return prediction[0][0]

def invoke_model(flats_list):
  # print(f"Found {len(jpg_files)} photos of flats\n")
  print("START CNN model SCAN!")
  for flat in flats_list:
    res_score = predict_image('/home/kali/Desktop/konsyerzh_bot/app/test_data/'+flat['photo'],1)
    flat['photo_score'] = res_score.item()  

  return flats_list
  




if __name__ == "__main__":
    all_files = os.listdir('new')

    # Фильтруем список, оставляя только .jpg файлы
    jpg_files = [f for f in all_files if f.endswith('.jpg')]

    # print(jpg_files)
    print(f"Found {len(jpg_files)} photos of flats\n")
    print("START CNN model SCAN!")
    for img in jpg_files:
        predict_image('images/'+img,1)