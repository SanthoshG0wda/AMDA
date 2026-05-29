import random
import time
from datetime import datetime

class ThermostatIoT:
    def __init__(self, device_id, target_temp=22.0):
        self.device_id = device_id
        self.current_temp = 20.0  # Starting temperature
        self.target_temp = target_temp
        self.is_heating = False
        self.is_cooling = False

    def read_sensor(self):
        # Simulate natural temperature fluctuation
        fluctuation = random.uniform(-0.5, 0.5)

        # Adjust temperature based on HVAC state
        if self.is_heating:
            self.current_temp += 0.3
        elif self.is_cooling:
            self.current_temp -= 0.3

        self.current_temp += fluctuation
        return round(self.current_temp, 2)

    def update_hvac_state(self):
        # Simple hysteresis loop to prevent rapid switching
        if self.current_temp < self.target_temp - 0.5:
            self.is_heating = True
            self.is_cooling = False
        elif self.current_temp > self.target_temp + 0.5:
            self.is_heating = False
            self.is_cooling = True
        elif abs(self.current_temp - self.target_temp) < 0.2:
            self.is_heating = False
            self.is_cooling = False

    def get_status(self):
        status = "HEATING" if self.is_heating else "COOLING" if self.is_cooling else "IDLE"
        return {
            "device_id": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "current_temp": self.read_sensor(),
            "target_temp": self.target_temp,
            "hvac_status": status
        }

def main():
    device = ThermostatIoT(device_id="TH-101", target_temp=22.0)
    print(f"Starting Thermostat Simulation [{device.device_id}]...")
    print(f"Target Temperature: {device.target_temp}°C")
    print("-" * 40)

    try:
        while True:
            device.update_hvac_state()
            status = device.get_status()

            print(f"[{status['timestamp']}] Temp: {status['current_temp']}°C | "
                  f"Target: {status['target_temp']}°C | Status: {status['hvac_status']}")

            time.sleep(2)
    except KeyboardInterrupt:
        print("\nSimulation stopped by user.")

if __name__ == "__main__":
    main()
