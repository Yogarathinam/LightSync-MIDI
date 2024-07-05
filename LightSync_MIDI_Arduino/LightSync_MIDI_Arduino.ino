#include <FastLED.h>

#define NUM_LEDS 144  // Number of LEDs in your strip
#define DATA_PIN 6     // Pin connected to the data input of WS2812B on Arduino

CRGB leds[NUM_LEDS];

void setup() {
  Serial.begin(115200);  // Initialize serial communication
  while (!Serial);

  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(255); // Set initial brightness

  fill_solid(leds, NUM_LEDS, CRGB::Black); // Clear LED strip
  FastLED.show();

  powerOnfadeEffect(CRGB::Blue); // Glow blue for 1 second on power-on
  fill_solid(leds, NUM_LEDS, CRGB::Black); // Clear LED strip after the initial glow
  FastLED.show();
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    processCommand(command);
  }
}

void processCommand(String command) {
  // Format: led_index,r,g,b,brightness
  int comma1 = command.indexOf(',');
  int comma2 = command.indexOf(',', comma1 + 1);
  int comma3 = command.indexOf(',', comma2 + 1);
  int comma4 = command.indexOf(',', comma3 + 1);

  if (comma1 == -1 || comma2 == -1 || comma3 == -1 || comma4 == -1) {
    return; // Invalid command format
  }

  int led_index = command.substring(0, comma1).toInt();
  int r = command.substring(comma1 + 1, comma2).toInt();
  int g = command.substring(comma2 + 1, comma3).toInt();
  int b = command.substring(comma3 + 1, comma4).toInt();
  int brightness_percentage = command.substring(comma4 + 1).toInt();

  // Ensure LED index is within range
  if (led_index >= 0 && led_index < NUM_LEDS) {
    // Calculate brightness value in range 0-255
    int brightness_value = map(brightness_percentage, 0, 100, 0, 255);

    // Set LED color and brightness
    leds[led_index] = CRGB(r, g, b);
    FastLED.setBrightness(brightness_value);
    FastLED.show();
  }
}

void powerOnfadeEffect(CRGB color) {
  for (int i = 0; i <= 200; i++) {
    FastLED.setBrightness(i);
    fill_solid(leds, NUM_LEDS, color);
    FastLED.show();
    delay(20);
  }
  for (int i = 200; i >= 0; i--) {
    FastLED.setBrightness(i);
    fill_solid(leds, NUM_LEDS, color);
    FastLED.show();
    delay(20);
  }
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  FastLED.show();
}
