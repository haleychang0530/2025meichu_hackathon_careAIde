from gtts import gTTS
import pygame
import threading
import time

lock = 0

def to_ch_gen_mp3(text):
    global lock
    lock = threading.Lock()
    pygame.mixer.init()
    tts = gTTS(text=text, lang='zh-TW')
    tts.save("output.mp3")

def to_ch_play():
    global lock
    with lock:
        pygame.mixer.music.load("output.mp3")
        pygame.mixer.music.play()

def to_ch_end():
    global lock
    with lock:
        pygame.mixer.music.stop()

if __name__ == "__main__":
    to_ch_gen_mp3("恭喜隊伍：我以為這是吃貨大會，獲得AMD組第一名。")
    to_ch_play()
    time.sleep(7)
    to_ch_end()
    