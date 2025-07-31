import csv
import json
from datetime import datetime
from telethon.sync import TelegramClient
from telethon.tl.types import Message

# Конфигурация (замените на свои данные)
API_ID = 12345  # Получить на https://my.telegram.org
API_HASH = 'ваш_api_hash'
PHONE = '+номер_телефона'  # Формат: '+79123456789'
BOT_USERNAME = 'username_bота'  # Например, 'mybot' для @mybot
SESSION_FILE = 'telegram_session'  # Файл для сохранения сессии

# Флаги
SAVE_JSON = True  # Сохранить историю в JSON
SAVE_CSV = True   # Сохранить историю в CSV
LIMIT = 1000      # Макс. число сообщений (None для всех)

def main():
    # Инициализация клиента (с сохранением сессии)
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)

    try:
        # Подключение (без разлогина на других устройствах)
        client.connect()
        if not client.is_user_authorized():
            client.start(phone=PHONE, force_sms=False, no_updates=True)
            print("✅ Сессия сохранена в файл:", SESSION_FILE + '.session')

        print("🔹 Загружаю историю чата с ботом...")
        messages = client.get_messages(BOT_USERNAME, limit=LIMIT)

        # Преобразуем сообщения в словари
        history = []
        for msg in messages:
            history.append({
                'date': msg.date.isoformat(),
                'text': msg.text,
                'id': msg.id,
                'is_bot': msg.out  # False если сообщение от бота
            })

        # Сохранение в JSON
        if SAVE_JSON:
            with open('chat_history.json', 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
            print("💾 Сохранено в JSON: chat_history.json")

        # Сохранение в CSV
        if SAVE_CSV:
            with open('chat_history.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['date', 'text', 'id', 'is_bot'])
                writer.writeheader()
                writer.writerows(history)
            print("📊 Сохранено в CSV: chat_history.csv")

    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        client.disconnect()

if __name__ == '__main__':
    main()