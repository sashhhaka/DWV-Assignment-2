import csv
import time
import requests
from datetime import datetime


def read_csv_and_send(file_path, server_url):
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        headers = ['ip_address', 'latitude', 'longitude', 'timestamp', 'suspicious']
        data = []

        # Пропускаем заголовок, если он есть
        next(reader, None)

        for row in reader:
            data.append(dict(zip(headers, row)))

    # Сортировка по временной метке
    data.sort(key=lambda x: int(x['timestamp']))

    # Получение начального времени
    start_time = int(data[0]['timestamp'])
    real_start_time = time.time()

    for packet in data:
        # Расчет времени ожидания до отправки следующего пакета
        packet_time = int(packet['timestamp'])
        elapsed_sim_time = packet_time - start_time
        elapsed_real_time = time.time() - real_start_time

        # Ожидание нужного момента для отправки (ускоряем в 10 раз для демонстрации)
        wait_time = (elapsed_sim_time - elapsed_real_time) / 10
        if wait_time > 0:
            time.sleep(wait_time)

        # Подготовка данных для отправки
        payload = {
            'ip': packet['ip_address'],
            'latitude': float(packet['latitude']),
            'longitude': float(packet['longitude']),
            'timestamp': int(packet['timestamp']),
            'suspicious': float(packet['suspicious']) > 0
        }

        # Отправка данных на сервер
        try:
            response = requests.post(f"{server_url}/api/packets", json=payload)
            print(f"Отправлен пакет: {payload['ip']}, статус: {response.status_code}")
        except Exception as e:
            print(f"Ошибка при отправке пакета: {e}")


if __name__ == "__main__":
    read_csv_and_send('sender/ip_addresses.csv', 'http://localhost:5000')