from flask import Flask, render_template, jsonify, request, send_file
import threading
import time
import csv
import os
from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP, ICMP

app = Flask(__name__)

monitoring_active = False
save_packets_enabled = False
captured_packets = []
sniffer_thread = None
LOG_FILE = 'captured_traffic.csv'
LOG_FIELDNAMES = ['Time', 'Source IP', 'Destination IP', 'Protocol', 'Packet Size', 'Source Port', 'Destination Port', 'Service']

PORT_MAPPING = {
    '80': 'HTTP',
    '443': 'HTTPS',
    '53': 'DNS',
    '21': 'FTP',
    '22': 'SSH',
    '25': 'SMTP',
    '110': 'POP3',
    '143': 'IMAP',
    '3389': 'RDP',
    '8080': 'HTTP-Proxy'
}

def save_to_file(packet_info):
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=LOG_FIELDNAMES)
        if not file_exists:
            writer.writeheader()
        writer.writerow(packet_info)

def packet_callback(packet):
    global captured_packets
    if not monitoring_active:
        return

    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst
        proto = "Other"
        src_port = "-"
        dst_port = "-"
        service = "-"
        
        if TCP in packet:
            proto = "TCP"
            src_port = str(packet[TCP].sport)
            dst_port = str(packet[TCP].dport)
            service = PORT_MAPPING.get(dst_port, PORT_MAPPING.get(src_port, "Unknown"))
        elif UDP in packet:
            proto = "UDP"
            src_port = str(packet[UDP].sport)
            dst_port = str(packet[UDP].dport)
            service = PORT_MAPPING.get(dst_port, PORT_MAPPING.get(src_port, "Unknown"))
        elif ICMP in packet:
            proto = "ICMP"

        packet_info = {
            'Time': datetime.now().strftime("%H:%M:%S"),
            'Source IP': src_ip,
            'Destination IP': dst_ip,
            'Protocol': proto,
            'Packet Size': str(len(packet)),
            'Source Port': src_port,
            'Destination Port': dst_port,
            'Service': service
        }
        
        captured_packets.append(packet_info)
        
        if save_packets_enabled:
            save_to_file(packet_info)
        
        if len(captured_packets) > 50000:
            captured_packets.pop(0)

def start_sniffing():
    sniff(prn=packet_callback, store=0, stop_filter=lambda x: not monitoring_active)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start', methods=['POST'])
def start_monitoring():
    global monitoring_active, captured_packets, sniffer_thread, save_packets_enabled
    if not monitoring_active:
        captured_packets = []
        
        # Get save preference from request
        data = request.get_json() or {}
        save_packets_enabled = data.get('save_to_csv', False)
        
        if save_packets_enabled:
            with open(LOG_FILE, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=LOG_FIELDNAMES)
                writer.writeheader()
            
        monitoring_active = True
        sniffer_thread = threading.Thread(target=start_sniffing, daemon=True)
        sniffer_thread.start()
        return jsonify({
            "status": "success", 
            "message": "Live monitoring started",
            "saving": save_packets_enabled
        })
    return jsonify({"status": "error", "message": "Monitoring already active"})

@app.route('/api/download', methods=['GET'])
def download_file():
    if os.path.exists(LOG_FILE):
        return send_file(LOG_FILE, as_attachment=True)
    return jsonify({"status": "error", "message": "No capture file found"}), 404

@app.route('/api/stop', methods=['POST'])
def stop_monitoring():
    global monitoring_active
    monitoring_active = False
    return jsonify({"status": "success", "message": "Monitoring stopped"})

@app.route('/api/data', methods=['GET'])
def get_data():
    global monitoring_active, captured_packets
    
    try:
        page = int(request.args.get('page', 0))
    except:
        page = 0

    limit = 1000
    total_packets = len(captured_packets)
    
    tcp_count = sum(1 for p in captured_packets if p['Protocol'] == 'TCP')
    udp_count = sum(1 for p in captured_packets if p['Protocol'] == 'UDP')
    icmp_count = sum(1 for p in captured_packets if p['Protocol'] == 'ICMP')
    total_size = sum(int(p['Packet Size']) for p in captured_packets)
    avg_size = round(total_size / total_packets, 2) if total_packets > 0 else 0

    if page == 0:
        display_data = captured_packets[-limit:] if total_packets > limit else captured_packets
    else:
        start_idx = max(0, total_packets - (page * limit))
        end_idx = max(0, total_packets - ((page - 1) * limit))
        display_data = captured_packets[start_idx:end_idx]

    return jsonify({
        "status": "running" if monitoring_active else "stopped",
        "data": display_data,
        "total_count": total_packets,
        "page": page,
        "max_pages": (total_packets + limit - 1) // limit,
        "stats": {
            "total_packets": total_packets,
            "tcp_count": tcp_count,
            "udp_count": udp_count,
            "icmp_count": icmp_count,
            "avg_size": avg_size
        }
    })

if __name__ == '__main__':
    print("Starting Flask server...")
    print("NOTE: Real-time packet capture requires Administrator/Root privileges.")
    app.run(debug=True, port=5000, use_reloader=False)
