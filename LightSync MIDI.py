import tkinter as tk
from tkinter import ttk, colorchooser
import mido
import serial
import serial.tools.list_ports
import time

# Constants for MIDI note range (adjust based on your keyboard)
lowest_note = 21  # MIDI note number for the lowest key (e.g., A0)
highest_note = 108  # MIDI note number for the highest key (e.g., C8)
NUM_KEYS = 61  # Number of keys on the MIDI keyboard
NUM_LEDS = 144  # Total number of LEDs in your WS2812B strip

class MidiLightControllerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("LightSync MIDI")

        self.selected_color = (255, 0, 0)
        self.brightness = 100  # Default brightness percentage
        self.keys = []
        self.key_to_led_map = {}
        self.octave_shift = 0  # Default octave shift (0 means no shift)
        self.transpose = 0  # Default transpose value (0 means no transpose)

        # MIDI Port Selection
        self.midi_port_var = tk.StringVar()
        self.midi_port_menu = ttk.Combobox(root, textvariable=self.midi_port_var)
        self.midi_port_menu.grid(row=0, column=1, padx=10, pady=10)
        tk.Label(root, text="MIDI Port:").grid(row=0, column=0, padx=10, pady=10)

        # Arduino Port Selection
        self.arduino_port_var = tk.StringVar()
        self.arduino_port_menu = ttk.Combobox(root, textvariable=self.arduino_port_var)
        self.arduino_port_menu.grid(row=1, column=1, padx=10, pady=10)
        tk.Label(root, text="Arduino/ESP32 Port:").grid(row=1, column=0, padx=10, pady=10)

        # Refresh Button
        tk.Button(root, text="Refresh Ports", command=self.refresh_ports).grid(row=2, column=0, columnspan=2, padx=10, pady=10)

        # Color Selection
        tk.Button(root, text="Select Color", command=self.select_color).grid(row=3, column=0, columnspan=2, padx=10, pady=10)

        # Brightness Control
        tk.Label(root, text="Brightness (%):").grid(row=4, column=0, padx=10, pady=10)
        self.brightness_scale = tk.Scale(root, from_=0, to=100, orient=tk.HORIZONTAL)
        self.brightness_scale.set(self.brightness)
        self.brightness_scale.grid(row=4, column=1, padx=10, pady=10)

        # Octave Shift Control
        tk.Label(root, text="Octave Shift:").grid(row=5, column=0, padx=10, pady=10)
        self.octave_shift_scale = tk.Scale(root, from_=-4, to=4, orient=tk.HORIZONTAL, command=self.update_mappings)
        self.octave_shift_scale.set(self.octave_shift)
        self.octave_shift_scale.grid(row=5, column=1, padx=10, pady=10)

        # Transpose Control
        tk.Label(root, text="Transpose:").grid(row=6, column=0, padx=10, pady=10)
        self.transpose_scale = tk.Scale(root, from_=-12, to=12, orient=tk.HORIZONTAL, command=self.update_mappings)
        self.transpose_scale.set(self.transpose)
        self.transpose_scale.grid(row=6, column=1, padx=10, pady=10)

        # Start/Stop Button
        self.start_button = tk.Button(root, text="Start", command=self.start_stop)
        self.start_button.grid(row=7, column=0, columnspan=2, padx=10, pady=10)

        # Status Display
        self.status_label = tk.Label(root, text="Status: Disconnected")
        self.status_label.grid(row=8, column=0, columnspan=2, padx=10, pady=10)

        # Placeholder for MIDI and Arduino connections
        self.midi_input = None
        self.arduino = None

        # Initial port refresh
        self.refresh_ports()

    def select_color(self):
        color = colorchooser.askcolor()
        if color[0]:
            self.selected_color = tuple(int(c) for c in color[0])

    def start_stop(self):
        if self.start_button.cget("text") == "Start":
            self.start()
        else:
            self.stop()

    def start(self):
        midi_port = self.midi_port_var.get()
        arduino_port = self.arduino_port_var.get()
        self.brightness = self.brightness_scale.get()
        self.octave_shift = self.octave_shift_scale.get() * 12  # Convert octave shift to number of semitones
        self.transpose = self.transpose_scale.get()

        # Connect to MIDI and Arduino
        try:
            self.midi_input = mido.open_input(midi_port, callback=self.handle_midi)
            self.arduino = serial.Serial(arduino_port, 115200, timeout=1)
            self.status_label.config(text=f"Status: Connected to {midi_port} and {arduino_port}")
            self.start_button.config(text="Stop")
        except Exception as e:
            self.status_label.config(text=f"Error: {e}")

    def stop(self):
        # Close MIDI and Arduino connections
        if self.midi_input:
            self.midi_input.close()
        if self.arduino:
            self.arduino.close()
        self.status_label.config(text="Status: Disconnected")
        self.start_button.config(text="Start")

    def handle_midi(self, msg):
        if msg.type == 'note_on':
            velocity = msg.velocity
            note = msg.note + self.octave_shift + self.transpose
            led_index = self.map_note_to_led(note)
            if led_index is not None:
                self.send_to_arduino(led_index, self.selected_color[0], self.selected_color[1], self.selected_color[2], velocity)
        elif msg.type == 'note_off':
            note = msg.note + self.octave_shift + self.transpose
            led_index = self.map_note_to_led(note)
            if led_index is not None:
                self.send_to_arduino(led_index, 0, 0, 0, 0)

    def map_note_to_led(self, note):
        # Map each key to an LED with a space between each
        if lowest_note <= note <= lowest_note + NUM_KEYS - 1:
            return (note - lowest_note) * 2  # Multiply by 2 to create a space
        return None

    def send_to_arduino(self, led_index, r, g, b, velocity):
        if self.arduino:
            brightness_percentage = self.brightness_scale.get()
            message = f"{led_index},{r},{g},{b},{brightness_percentage}\n"
            self.arduino.write(message.encode())

    def refresh_ports(self):
        self.refresh_midi_ports()
        self.refresh_arduino_ports()

    def refresh_midi_ports(self):
        midi_ports = mido.get_input_names()
        self.midi_port_menu['values'] = midi_ports

    def refresh_arduino_ports(self):
        arduino_ports = [port.device for port in serial.tools.list_ports.comports()]
        self.arduino_port_menu['values'] = arduino_ports

    def update_mappings(self, *_):
        self.octave_shift = self.octave_shift_scale.get() * 12
        self.transpose = self.transpose_scale.get()
        if self.midi_input:
            for msg in self.midi_input.iter_pending():
                self.handle_midi(msg)

if __name__ == "__main__":
    root = tk.Tk()
    app = MidiLightControllerApp(root)
    root.mainloop()
