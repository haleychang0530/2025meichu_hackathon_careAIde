# ROCm環境設定
import os
os.environ['HSA_OVERRIDE_GFX_VERSION'] = '10.3.0'  # 根據你的GPU調整
os.environ['HIP_VISIBLE_DEVICES'] = '0'

# 基本套件導入
import torch
import numpy as np
from transformers import pipeline, AutoProcessor, AutoModelForSpeechSeq2Seq
import soundfile as sf
import subprocess
import tempfile
from pydub import AudioSegment
import librosa
import torchaudio
from torchaudio.transforms import Resample

# global varivbles

device = 0

def check_tools():
    try:
        import ChatTTS
        print("✅ ChatTTS導入成功")
    except ImportError:
        print("❌ ChatTTS未安裝，請執行: pip install ChatTTS")
        ChatTTS = None


    # 嘗試導入台灣言語工具
    try:
        from 臺灣言語工具 import 語音合成
        from 臺灣言語工具 import 語音辨識
        print("✅ 台灣言語工具導入成功")
    except ImportError as e:
        print(f"❌ 台灣言語工具導入失敗: {e}")
        語音合成 = None
        語音辨識 = None
    
def check_rocm_environment():
    """檢查ROCm環境"""
    print("=== ROCm環境檢查 ===")
    print(f"PyTorch版本: {torch.__version__}")
    print(f"ROCm可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU數量: {torch.cuda.device_count()}")
        print(f"當前GPU: {torch.cuda.current_device()}")
        print(f"GPU名稱: {torch.cuda.get_device_name()}")
    print("==================")

def setup_device():
    """設定計算設備"""
    if torch.cuda.is_available():
        _device = "cuda"
        print(f"✅ 使用GPU: {torch.cuda.get_device_name()}")
    else:
        _device = "cpu"
        print("⚠️ 使用CPU（建議使用GPU加速）")

    torch.set_default_device(_device)
    return _device

def convert_windows_path(path):
    """轉換Windows路徑為WSL路徑"""
    if path.startswith('C:'):
        return path.replace('C:', '/mnt/c').replace('\\', '/')
    return path


def resample_audio_to_16khz(waveform, original_sample_rate, target_rate=16000):
    """將音檔重新採樣到16kHz"""
    
    if original_sample_rate == target_rate:
        print(f"✅ 採樣率已是 {target_rate}Hz，無需重新採樣")
        return waveform, target_rate
    
    print(f"🔄 重新採樣: {original_sample_rate}Hz → {target_rate}Hz")
    
    # 方法1: 使用librosa重新採樣（如果可用）
    try:
        if librosa:
            if len(waveform.shape) > 1 and waveform.shape[0] > 1:
                # 多聲道處理
                resampled = []
                for channel in waveform:
                    channel_resampled = librosa.resample(
                        channel.numpy(), 
                        orig_sr=original_sample_rate, 
                        target_sr=target_rate
                    )
                    resampled.append(channel_resampled)
                waveform_resampled = torch.from_numpy(np.array(resampled))
            else:
                # 單聲道處理
                waveform_np = waveform.squeeze().numpy()
                waveform_resampled_np = librosa.resample(
                    waveform_np, 
                    orig_sr=original_sample_rate, 
                    target_sr=target_rate
                )
                waveform_resampled = torch.from_numpy(waveform_resampled_np).unsqueeze(0)
            
            print(f"✅ librosa重新採樣成功")
            return waveform_resampled, target_rate
    except Exception as e:
        print(f"⚠️ librosa重新採樣失敗: {e}")
    
    # 方法2: 使用torchaudio重新採樣
    try:
        resampler = Resample(orig_freq=original_sample_rate, new_freq=target_rate)
        waveform_resampled = resampler(waveform)
        print(f"✅ torchaudio重新採樣成功")
        return waveform_resampled, target_rate
    except Exception as e:
        print(f"⚠️ torchaudio重新採樣失敗: {e}")
    
    # 方法3: 使用ffmpeg重新採樣
    try:
        import tempfile
        import subprocess
        
        # 儲存原始音檔
        temp_input = tempfile.mktemp(suffix='.wav')
        torchaudio.save(temp_input, waveform, original_sample_rate)
        
        # 使用ffmpeg重新採樣
        temp_output = tempfile.mktemp(suffix='.wav')
        subprocess.run([
            'ffmpeg', '-i', temp_input, 
            '-ar', str(target_rate), 
            '-ac', '1',  # 轉為單聲道
            temp_output, '-y'
        ], check=True, capture_output=True)
        
        # 載入重新採樣後的音檔
        waveform_resampled, _ = torchaudio.load(temp_output)
        
        # 清理暫存檔
        os.remove(temp_input)
        os.remove(temp_output)
        
        print(f"✅ ffmpeg重新採樣成功")
        return waveform_resampled, target_rate
    except Exception as e:
        print(f"❌ ffmpeg重新採樣失敗: {e}")
    
    raise RuntimeError(f"無法重新採樣音檔從 {original_sample_rate}Hz 到 {target_rate}Hz")


def ensure_16khz_for_whisper(waveform, sample_rate):
    """確保音檔符合Whisper的16kHz要求"""
    
    print(f"🎵 檢查採樣率: {sample_rate}Hz")
    
    # 檢查是否需要重新採樣
    if sample_rate != 16000:
        print(f"⚠️ 採樣率 {sample_rate}Hz 不符合Whisper要求，重新採樣到16kHz")
        waveform, sample_rate = resample_audio_to_16khz(waveform, sample_rate)
    
    # 確保是單聲道
    if len(waveform.shape) > 1 and waveform.shape[0] > 1:
        print("🔄 轉換為單聲道")
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    
    print(f"✅ 音檔準備完成: 採樣率={sample_rate}Hz, 形狀={waveform.shape}")
    return waveform, sample_rate

def load_audio_for_whisper(audio_path):
    """專為Whisper模型載入和預處理音檔"""
    
    print(f"🎵 為Whisper載入音檔: {audio_path}")
    
    # 使用之前建立的多重備援載入函數
    waveform, sample_rate = load_audio_smart(audio_path)
    
    # 確保符合Whisper要求
    waveform, sample_rate = ensure_16khz_for_whisper(waveform, sample_rate)
    
    return waveform, sample_rate

class TaiwaneseSTTTTSSystem:
    def __init__(self):
        """初始化台語語音轉換系統（ROCm優化版）"""
        self.device = device
        #self.setup_stt_model()
        #self.setup_tts_model()
        self.setup_taiwanese_tools()

    def setup_stt_model(self):
        
        """設定台語轉中文的語音辨識模型"""
        try:
            # 修正模型名稱
            model_name = "C:/Users\johns\models\whisper"

            self.stt_processor = AutoProcessor.from_pretrained(model_name)
            self.stt_model = AutoModelForSpeechSeq2Seq.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None
            )
            print(f"✅ Whisper 載入成功，使用設備：{self.device}")
        except Exception as e:
            print(f"❌ MR Breeze ASR載入失敗，改用Whisper：{e}")
            # 備用方案：使用Whisper
            self.stt_pipe = pipeline(
                "automatic-speech-recognition",
                model="openai/whisper-medium",
                device=0 if self.device == "cuda" else -1
            )
            self.stt_model = None

    def setup_tts_model(self):
        """設定中文轉台語的語音合成模型（ROCm優化）"""
        try:
            if ChatTTS:
                self.chattts = ChatTTS.Chat()

                # ROCm環境設定
                if self.device == "cuda":
                    self.chattts.load_models(
                        compile=False,
                        device="cuda",
                        dtype=torch.float16
                    )
                else:
                    self.chattts.load_models(compile=False)

                print("✅ ChatTTS載入成功")
            else:
                raise ImportError("ChatTTS未導入")
        except Exception as e:
            print(f"❌ ChatTTS載入失敗：{e}")
            self.chattts = None

    def setup_taiwanese_tools(self):
        """設定台灣言語工具"""
        try:
            if 語音合成 and 語音辨識:
                # 正確實例化類別
                self.taiwanese_synthesizer = 語音合成()
                self.taiwanese_recognizer = 語音辨識()
                print("✅ 台灣言語工具載入成功")
            else:
                raise ImportError("台灣言語工具模組未導入")
        except Exception as e:
            print(f"❌ 台灣言語工具載入失敗: {e}")
            self.taiwanese_synthesizer = None
            self.taiwanese_recognizer = None
            

    def taiwanese_to_chinese_text(self, audio_file_path):
        try:
            print(f"🎤 開始語音辨識: {audio_file_path}")
            
            # 處理路徑
            
            # 載入並確保16kHz採樣率
            waveform, sample_rate = torchaudio.load(audio_file_path)
            audio, sample_rate = ensure_16khz_for_whisper(waveform, sample_rate)
            
            print("Whisper 語音處理完成")
            model_name = "C:/Users\johns\models\whisper"

            pipe = pipeline("automatic-speech-recognition", model = model_name)

            result = pipe(audio, generate_kwargs={"language": "zh", "task": "transcribe"})
            text = result['text']
            
            print(f"📝 辨識完成: {text}")
            return text
            
        except Exception as e:
            print(f"❌ 語音辨識錯誤: {e}")
            return None

    #def chinese_to_taiwanese_speech(self, chinese_text):
        

    def play_audio(self, audio_file):
        """播放音檔"""
        try:
            # 在WSL環境中使用系統播放器
            audio_path = convert_windows_path(audio_file)
            subprocess.run(['aplay', audio_path], check=True)
        except Exception as e:
            print(f"❌ 播放音檔錯誤: {e}")
            print("💡 提示：在WSL中可能需要安裝音頻播放工具")

    def process_taiwanese_audio_pipeline(self, input_audio_file):
        """完整的台語音檔處理流程"""
        print("🎙️ 開始處理台語音檔...")

        # 步驟1: 台語語音轉中文文字
        chinese_text = self.taiwanese_to_chinese_text(input_audio_file)
        if chinese_text:
            print(f"📝 辨識結果: {chinese_text}")
            return chinese_text
        else:
            print("❌ 語音辨識失敗")
            return

        # 步驟2: 中文文字轉台語語音
        '''output_file = self.chinese_to_taiwanese_speech(chinese_text)
        if output_file:
            print(f"🔊 語音合成完成: {output_file}")

            # 步驟3: 播放合成的台語語音
            self.play_audio(output_file)
        else:
            print("❌ 語音合成失敗")'''

def resample_audio_to_16khz(waveform, original_sample_rate, target_rate=16000):
    """將音檔重新採樣到16kHz"""
    
    if original_sample_rate == target_rate:
        print(f"✅ 採樣率已是 {target_rate}Hz，無需重新採樣")
        return waveform, target_rate
    
    print(f"🔄 重新採樣: {original_sample_rate}Hz → {target_rate}Hz")
    
    try:
        resampler = Resample(orig_freq=original_sample_rate, new_freq=target_rate)
        waveform_resampled = resampler(waveform)
        print(f"✅ 重新採樣成功")
        return waveform_resampled, target_rate
    except Exception as e:
        print(f"❌ 重新採樣失敗: {e}")
        raise

# 修正原有的load_audio_smart函數
# original_load_audio_smart = load_audio_smart

def load_audio_smart(audio_path, target_sr=16000):
    """智能載入音檔並重新採樣（修正版）"""
    
    # 使用原有的載入函數
    waveform, sample_rate = original_load_audio_smart(audio_path)
    
    # 重新採樣到目標採樣率
    if sample_rate != target_sr:
        waveform, sample_rate = resample_audio_to_16khz(waveform, sample_rate, target_sr)
    
    # 確保單聲道
    if len(waveform.shape) > 1 and waveform.shape[0] > 1:
        print("🔄 轉換為單聲道")
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    
    return waveform, sample_rate

# 使用範例（ROCm優化版）
def transform():
    # 初始化系統
    print("🚀 正在初始化台語語音轉換系統（ROCm版）...")
    system = TaiwaneseSTTTTSSystem()

    # 範例1: 處理台語音檔
    #input_audio = "C:/Users/johns/taiwanese_voice/cv-corpus-22.0-delta-2025-06-20/nan-tw/clips/common_voice_nan-tw_42722929.mp3"
    input_audio = "C:/Users/johns/Desktop/project/2025meichu_hackathon/backend/speech_to_text/output.wav"
    chinese_text = system.process_taiwanese_audio_pipeline(input_audio)
    
    with open('C:/Users/johns/Desktop/project/2025meichu_hackathon/backend/example.txt', 'w', encoding='utf-8') as file:
        file.write(chinese_text)
    # 範例2: 直接中文轉台語
    '''chinese_text = "你好，今天天氣很好"
    print(f"\n🔄 轉換中文文字: {chinese_text}")
    output_file = system.chinese_to_taiwanese_speech(chinese_text, "direct_output.wav")
    if output_file:
        print(f"✅ 直接轉換成功: {output_file}")
        system.play_audio(output_file)
    else:
        print("❌ 直接轉換失敗")'''
        
def initial_setting():
    global device
    check_tools()
    check_rocm_environment()
    device = setup_device()
        