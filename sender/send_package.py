import csv
import time
import requests
from datetime import datetime


def read_csv_and_send(file_path, server_url):
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        headers = ['ip_address', 'latitude', 'longitude', 'timestamp', 'suspicious']
        data = []

        # Skip header if it exists
        next(reader, None)

        for row in reader:
            data.append(dict(zip(headers, row)))

    # Sort by timestamp
    data.sort(key=lambda x: int(x['timestamp']))

    # Get start time
    start_time = int(data[0]['timestamp'])
    real_start_time = time.time()

    for packet in data:
        # Calculate wait time before sending the next packet
        packet_time = int(packet['timestamp'])
        elapsed_sim_time = packet_time - start_time
        elapsed_real_time = time.time() - real_start_time

        # Wait for the right moment to send (speed up 10x for demonstration)
        wait_time = (elapsed_sim_time - elapsed_real_time) / 10
        if wait_time > 0:
            time.sleep(wait_time)

        # Prepare data for sending
        payload = {
            'ip': packet['ip_address'],
            'latitude': float(packet['latitude']),
            'longitude': float(packet['longitude']),
            'timestamp': int(packet['timestamp']),
            'suspicious': float(packet['suspicious']) > 0
        }

        # Send data to server
        try:
            response = requests.post(f"{server_url}/api/packets", json=payload)
            print(f"Packet sent: {payload['ip']}, status: {response.status_code}")
        except Exception as e:
            print(f"Error sending packet: {e}")


if __name__ == "__main__":
    read_csv_and_send('ip_addresses.csv', 'http://server:5000')