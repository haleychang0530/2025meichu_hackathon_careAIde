from gtts import gTTS
import pygame
import threading
import time

lock = 0
is_qiut = False

def to_ch_gen_mp3(text):
    global lock, is_qiut
    lock = threading.Lock()
    is_qiut = False
    tts = gTTS(text=text, lang='zh-TW')
    tts.save("output.mp3")

def to_ch_play():
    global lock, is_qiut
    def _play_and_quit():
        global is_quit, lock
        with lock:
            if not pygame.mixer.get_init():  # 沒有初始化過才 init
                pygame.mixer.init()
                is_quit = False
            pygame.mixer.music.load("output.mp3")
            pygame.mixer.music.play()

        # 等待播放結束
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)

        # 播放完畢 → 釋放資源（只執行一次 quit）
        with lock:
            if not is_quit:
                pygame.mixer.quit()
                is_quit = True
                print("播放結束，自動 quit()")
    threading.Thread(target=_play_and_quit, daemon=True).start()

def to_ch_end():
    global lock, is_qiut
    if pygame.mixer.get_init():
            pygame.mixer.music.stop()
            if not is_quit:
                pygame.mixer.quit()
                is_quit = True
                print("手動停止並 quit()")

if __name__ == "__main__":
    to_ch_gen_mp3("恭喜隊伍：我以為這是吃貨大會，獲得AMD組第一名。")
    to_ch_play()
    time.sleep(7)
    to_ch_end()
    