# Final Project Report: NetPulse - Real-Time Network Traffic Monitor

## 1. Scope of Project
**NetPulse** is a lightweight, real-time network monitoring and analysis platform designed for network administrators and students. The scope of the project includes:
- **Live Packet Capture**: Capturing real-time traffic from local network interfaces.
- **Protocol Analysis**: Identifying and categorizing traffic into TCP, UDP, and ICMP protocols.
- **Service Mapping**: Automatically identifying application-layer services (e.g., HTTP, DNS, SSH) based on destination port numbers.
- **Real-Time Analytics**: Visualizing traffic statistics including total packet counts, protocol distribution, and average packet size.
- **Historical Data Access**: Allowing users to navigate through thousands of captured packets via a paginated interface.
- **Persistent Logging**: Automatically logging all captured session data to a CSV file for offline review.

## 2. Tech Stack
The project leverages a modern, full-stack architecture focused on performance and visual excellence:
- **Backend**: Python 3.x with **Flask** for the web server and API layer.
- **Networking Engine**: **Scapy** library for low-level packet sniffing and protocol dissection.
- **Frontend**: 
  - **HTML5**: Semantic structure.
  - **Vanilla CSS3**: Custom design system featuring "Glassmorphism" aesthetics, CSS Grid, and Flexbox.
  - **Vanilla JavaScript (ES6+)**: Real-time polling, dynamic DOM manipulation, and filtering logic.
- **Icons**: **Lucide Icons** for a modern, consistent UI look.
- **Data Storage**: CSV (Standard Library) for lightweight session logging.

## 3. Methodology: Steps Followed
1. **Requirement Analysis**: Defined the core functionality needed to simplify complex network data into a readable dashboard.
2. **Core Architecture Design**: Designed a non-blocking system using multithreading to ensure the sniffer doesn't interfere with the web server.
3. **Backend Implementation**:
   - Developed the Scapy-based sniffer with a circular buffer (50,000 packet limit) to manage memory.
   - Built a mapping system for common ports to user-friendly service names.
   - Implemented REST API endpoints for starting/stopping the capture and retrieving data batches.
4. **Frontend Implementation**:
   - Created a responsive, dark-mode dashboard with premium CSS gradients and transparency.
   - Implemented a polling mechanism to fetch updates every 1,000ms.
   - Developed client-side filtering logic for Protocol, Source IP, and Destination IP.
5. **Optimization & Stability**:
   - Integrated backend-side pagination to handle high-volume traffic without crashing the browser.
   - Added session-based logging that resets the CSV at the start of every new run.
6. **Testing**: Conducted multiple capture sessions involving various protocols (HTTP, Ping, DNS) to verify the accuracy of the dissection logic and the UI's responsiveness.

## 4. Challenges Faced
- **Thread Blocking**: The Scapy `sniff()` function is synchronous and blocks the execution of the Flask server.
  - *Solution*: Utilized Python’s `threading` module to run the sniffer in a background daemon thread, allowing the web server to remain responsive.
- **DOM Performance**: Rendering thousands of packet rows in the table caused significant browser lag.
  - *Solution*: Implemented backend-side pagination (1,000 packets per page) and limited the "Live" view to the most recent 1,000 records.
- **Administrative Privileges**: Raw socket access requires elevated permissions, which often led to silent failures.
  - *Solution*: Added explicit logging and UI-ready error handling to notify the user when the application is not running with Administrator/Root privileges.
- **Data Persistence vs. Performance**: Writing every packet to a database was too slow for real-time capture.
  - *Solution*: Used an asynchronous-style CSV appending method and kept a fast RAM-based history for the UI.

## 5. Future Work
If given more time, the following features would be implemented to enhance NetPulse:
- **Visual Charts**: Integrating **Chart.js** or **D3.js** to provide real-time line charts for traffic volume and pie charts for protocol distribution.
- **Intrusion Detection System (IDS)**: Implementing a basic rule-based engine to flag potential security threats like port scanning or SYN floods.
- **Payload Inspection**: Adding a "Details" view for each packet to inspect hex/ASCII payloads (e.g., viewing HTTP headers).
- **PCAP Export**: Allowing users to download the current session as a standard `.pcap` file for advanced analysis in Wireshark.
- **IPv6 Support**: Expanding the dissection logic to fully support IPv6 addressing and headers.

## 6. References
- **Scapy Documentation**: [https://scapy.readthedocs.io/](https://scapy.readthedocs.io/)
- **Flask Web Framework**: [https://flask.palletsprojects.com/](https://flask.palletsprojects.com/)
- **Lucide Icon Library**: [https://lucide.dev/](https://lucide.dev/)
- **MDN Web Docs (CSS/JS)**: [https://developer.mozilla.org/](https://developer.mozilla.org/)
- **Python Threading Reference**: [https://docs.python.org/3/library/threading.html](https://docs.python.org/3/library/threading.html)
