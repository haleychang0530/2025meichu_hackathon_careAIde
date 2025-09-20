# =======================================================
# 🌐 最終版：中文轉台羅、IPA，並用法文引擎語音合成
# =======================================================

# 📦 安裝必要套件 (Colab/Linux 環境)
# -------------------------------------------------------
import subprocess
import sys
import warnings
import pygame
import threading
import time
warnings.filterwarnings('ignore')

# 載入模組
# -------------------------------------------------------
import spacy, re, json
from taibun import Converter
import pypinyin
from pypinyin import Style
import opencc
from IPython.display import Audio, display
from gtts import gTTS
import os
print("\n✅ 所有模組載入成功")

# =======================================================
# 🎯 核心類別與函式
# =======================================================

# 擴充台語字典 (台羅帶數字聲調)
class CompleteTaiwaneseDict:
    def __init__(self):
        # 大幅擴充字典
        self.word_dict = {
            '很': 'tsin7', '真': 'tsin1', '超': 'tshiau1', '特別': 'tik-piat8', '非常': 'hui7-siong5',
'我': 'gua2', '你': 'li2', '他': 'i1', '她': 'i1', '我們': 'goan2', '你們': 'lin2', '他們': 'in1',
'的': 'e5', '是': 'si7', '有': 'u7', '沒有': 'bo5', '也': 'ma7', '都': 'long2', '會': 'e7', '要': 'beh4', '可以': 'kho2-i2',
'去': 'khi3', '來': 'lai5', '看': 'khuann3', '聽': 'thiann1', '說': 'kong2', '吃': 'tsiah8', '喝': 'lim1', '睡覺': 'khun3',
'走': 'kiann5', '坐': 'tse7', '站': 'khia7', '買': 'be2', '賣': 'bue7', '唱歌': 'tshiunn3-kua3',
'好': 'ho2', '壞': 'phainn2', '大': 'tua7', '小': 'sio2', '高': 'kuan5', '矮': 'e2', '新': 'sin1', '舊': 'ku7',
'美': 'sui2', '快': 'khuai3', '慢': 'ban7', '漂亮': 'sui2', '可愛': 'khio2-ai3','今天': 'kin1-a2-jit8', '明天': 'bin1-a2-tsai2', '昨天': 'tsa-hng5', '現在': 'hian7-ti7', '早上': 'tsi2-khi2', '中午': 'tiong1-tau3', '晚上': 'am3-hng1', '天氣': 'thinn1-khi3',
'家': 'tshng1', '學校': 'hak8-hau7', '公司': 'kong1-si1', '市場': 'tshih8-tshng3','頭': 'thau5', '手': 'tshiu2', '腳': 'kha1', '眼睛': 'bak8-tsiu1', '鼻子': 'phinn7-a2', '嘴巴': 'tshui3-kha1',
'肚子': 'to2-tsu7', '心臟': 'sim1-tsong3', '身體': 'sin1-the2','飯': 'png7', '麵': 'mi7', '肉': 'bah4', '魚': 'hi5', '菜': 'tshai3', '水': 'tsui2', '茶': 'te5', '咖啡': 'ka1-pi1',
'水果': 'tsui2-ko2', '便當': 'pian7-tong1', '小吃': 'sio2-tsiah8','什麼': 'siann2-mih4', '怎麼': 'tsuann2-ni7', '哪裡': 'to2-ui7', '嗎': 'mah4', '呢': 'neh4', '了': 'liau2', '吧': 'pah4','步驟': 'pu7-tsau3', '設定': 'set4-teng7', '螢幕': 'ing5-buh4', '手機': 'siu2-ki1', '連接': 'lian5-tsiap4',
'檢查': 'kiam2-tsa5', '開啟': 'khai1-khi2', '關閉': 'kuann1-pi3', '更新': 'king1-sin1',
'選擇': 'suan2-sik4', '輸入': 'lip4-jip4', '密碼': 'biat4-ma5', '下載': 'ha7-tsai3',
'安裝': 'an1-tsng1', '網路': 'bang5-loo7', 'Wi-Fi': 'wai-fi', '藍牙': 'n̂g5-ha1',
'應用程式': 'un2-iong7-sik4', '電腦': 'tian7-nao2', '充電': 'tsong1-tian7',
'電池': 'tian7-tshi5', '電源': 'tian7-guân5', '路由器': 'loo7-iunn5-khia4', '系統': 'he7-thong2','抱歉': 'po7-kiann3', '擔心': 'tam1-sim1', '困擾': 'khun3-jiau2', '不耐煩': 'put4-nai7-huann5',
'自責': 'tsu7-tsik4','分享': 'hun1-hiunn2', '聊天': 'liau5-thian1', '解決': 'kai2-khiat4', '問題': 'mun7-te5',
'朋友': 'peng5-iu2', '生活': 'sing1-ua7', '旅行': 'lu2-heng5','一模一樣': 'tsiok4-moh5-tsiok4-ngiong7', '七葷八素': 'tshit4-hun1-peh4-so3', '心甘情願': 'sim1-kam1-tsing5-guan7',
'人山人海': 'lin5-suann1-lin5-hai2', '大同小異': 'tua7-tong5-sio2-i7', '無緣無故': 'bo5-iuan5-bo5-ko3',
'說說笑笑': 'kong2-kong2-tshio3-tshio3', '不離不棄': 'put4-li5-put4-khi3','捷運': 'chia̍t-ūn', '公車': 'kong-tshia', '火車': 'hé-tshia', '高鐵': 'ko-thih', '飛機': 'hui-ki',
'開車': 'khui-tshia', '騎車': 'khiâ-tshia', '坐車': 'tsē-tshia','太陽': 'thài-iông', '月亮': 'ge̍h-niû', '星星': 'tshinn-tshinn', '下雨': 'ē-hōo', '風': 'hong',
'山': 'suann', '海': 'hái', '河': 'hô','會議': 'huē-gī', '報告': 'pò-kò', '作業': 'tsok-gia̍p', '考試': 'khó-sik', '學習': 'ha̍k-si̍p',
'老師': 'lāu-su', '同學': 'tông-o̍h', '辦公室': 'pān-kong-sik', '過程': 'Gue3-ding5'
        }
        print(f"📚 載入 {len(self.word_dict)} 個台語詞彙")
    
    def lookup(self, word):
        return self.word_dict.get(word, None)

# 智慧分詞器
class SmartTokenizer:
    def __init__(self):
        try:
            self.nlp = spacy.load("zh_core_web_sm")
            print("✅ spaCy 分詞器載入成功")
        except:
            self.nlp = None
            print("⚠️  spaCy 模型未載入，使用規則分詞。")
    
    def tokenize(self, text):
        if self.nlp:
            doc = self.nlp(text)
            return [token.text for token in doc if not token.is_punct and not token.is_space]
        else:
            return re.findall(r'[\u4e00-\u9fff]+|[^\u4e00-\u9fff\s]+', text)

# 台羅轉 IPA 轉換器
class TailoToIPAConverter:
    def __init__(self):
        self.initial_map = {
            'p': 'p', 'ph': 'pʰ', 'b': 'b', 'm': 'm',
            't': 't', 'th': 'tʰ', 'l': 'l', 'n': 'n',
            'k': 'k', 'kh': 'kʰ', 'g': 'g', 'ng': 'ŋ', 'h': 'h',
            'ts': 'ts', 'tsh': 'tsʰ', 'j': 'dz', 's': 's'
        }
        self.final_map = {
            'a': 'a', 'e': 'ɛ', 'i': 'i', 'o': 'ɔ', 'oo': 'o', 'u': 'u',
            'ai': 'ai', 'au': 'au', 'iau': 'iau', 'ui': 'ui',
            'ann': 'ã', 'inn': 'ĩ', 'unn': 'ũ', 'onn': 'ɔ̃', 'eng': 'ẽŋ',
            'am': 'am', 'an': 'an', 'ap': 'ap', 'at': 'at',
            'om': 'ɔm', 'on': 'ɔn', 'op': 'ɔp', 'ot': 'ɔt',
            'm': 'm̩', 'ng': 'ŋ̍'
        }
        self.clean_patt = re.compile(r'[0-9]')

    def convert(self, tailo_text: str) -> str:
        words = tailo_text.strip().split()
        ipa_parts = []
        for w in words:
            base = self.clean_patt.sub('', w)
            
            initial = ''
            for ini in sorted(self.initial_map.keys(), key=lambda x: -len(x)):
                if base.startswith(ini):
                    initial = ini
                    break
            
            final = base[len(initial):]
            
            ipa_ini = self.initial_map.get(initial, initial)
            ipa_fin = self.final_map.get(final, final)
            
            ipa_parts.append(f"{ipa_ini}{ipa_fin}")
            
        return ' '.join(ipa_parts)

# 優化版 Google TTS 系統
class OptimizedGoogleTTSSystem:
    def __init__(self):
        self.tokenizer = SmartTokenizer()
        self.dictionary = CompleteTaiwaneseDict()
        self.taibun_converter = Converter(system='Tailo', format='number')
        self.ipa_converter = TailoToIPAConverter()
        self.cc = opencc.OpenCC('s2t')
        print("✅ 系統初始化完成")

    def text_to_tailo_and_ipa(self, text, show_process=True):
        """繁體中文 -> 台羅 -> IPA"""
        text = self.cc.convert(text)
        if show_process:
            print(f"\n📝 原始繁體文字: {text}")
        
        tokens = self.tokenizer.tokenize(text)
        if show_process:
            print(f"🔤 分詞結果: {tokens}")
        
        tailo_parts = []
        found_count = 0
        
        for token in tokens:
            if not token.strip(): continue
            tailo = self.dictionary.lookup(token)
            if tailo:
                tailo_parts.append(tailo)
                found_count += 1
                if show_process: print(f"✅ {token} → {tailo}")
                continue
            
            backup = self.taibun_converter.get(token)
            if backup != token:
                tailo_parts.append(backup)
                if show_process: print(f"🔄 {token} → {backup}")
                continue

            pinyin_list = pypinyin.pinyin(token, style=Style.TONE3)
            pinyin = ' '.join(p[0] for p in pinyin_list)
            tailo_parts.append(pinyin)
            if show_process: print(f"⚠️  {token} → {pinyin}")
        
        tailo_text = ' '.join(tailo_parts)
        ipa_text = self.ipa_converter.convert(tailo_text)
        coverage = found_count / len(tokens) if tokens else 0
        
        print(f"\n🇹🇼 轉換後台羅: {tailo_text}")
        print(f"🎶 轉換後IPA: {ipa_text}")
        print(f"📊 字典覆蓋率: {coverage:.1%}")
        
        return {'tailo': tailo_text, 'ipa': ipa_text, 'coverage': coverage}

    def synthesize(self, text, lang, output_file_prefix):
        """使用 gTTS 進行語音合成"""
        output_file = f"{output_file_prefix}_{lang}.mp3"
        try:
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(output_file)
            return Audio(output_file)
        except Exception as e:
            print(f"❌ 語音合成失敗 ({lang}): {e}")
            return None

# =======================================================
# 🚀 執行流程與更多測試
# =======================================================

print("\n🎯 建立優化版 Google TTS 系統...")
tts_system = OptimizedGoogleTTSSystem()

def text_to_speech_full_demo(chinese_text):
    """
    主要執行函式，將中文轉換為台羅與IPA，並使用法文引擎合成語音。
    """
    conversion_result = tts_system.text_to_tailo_and_ipa(chinese_text)
    ipa_text = conversion_result['ipa']

    print("\n--- 音檔播放 ---")
    
    # 播放 IPA 語音 (使用法文引擎模擬台語發音)
    print("🎶  播放「法文」朗讀IPA (模擬台語): ")
    ipa_audio = tts_system.synthesize(ipa_text, 'id', 'ipa_output')
    if ipa_audio:
        display(ipa_audio)
    
lock = 0
is_qiut = False

def to_tw_gen_mp3(text):
    global lock, is_qiut
    lock = threading.Lock()
    is_qiut = False
    text_to_speech_full_demo(text)

def to_tw_play():
    global lock, is_qiut
    def _play_and_quit():
        global is_quit, lock
        with lock:
            if not pygame.mixer.get_init():  # 沒有初始化過才 init
                pygame.mixer.init()
                is_quit = False
            pygame.mixer.music.load("ipa_output_id.mp3")
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

def to_tw_end():
    global lock, is_qiut
    if pygame.mixer.get_init():
            pygame.mixer.music.stop()
            if not is_quit:
                pygame.mixer.quit()
                is_quit = True
                print("手動停止並 quit()")

if __name__ == "__main__":
    to_tw_gen_mp3("恭喜隊伍：我以為這是吃貨大會，獲得AMD組第一名。")
    to_tw_play()
    time.sleep(7)
    to_tw_end()