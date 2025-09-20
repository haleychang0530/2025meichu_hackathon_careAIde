import json
import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS # 新增：匯入 CORS 函式庫
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

app = Flask(__name__)
CORS(app) # 新增：允許跨域

# Dify API 設定
RECORD_FILE = "questions_record.json"

# default
target_email = "violetff.ee13@nycu.edu.tw"

# recent tech-question
recent_question = {}

# finctionality
# ----------------------------------------------------------------------

def send_report_email(receiver_email, subject, body):
    # 寄件者帳號（你的 Gmail）
    sender_email = "careaide.mchackathon2025@gmail.com"
    # Gmail App Password（16 碼）
    app_password = "fybe dkot wkdn daoj"


    # 建立郵件
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = formataddr(("CareAIde", sender_email))
    msg["To"] = receiver_email

    try:
        # 建立連線 (587 + STARTTLS)
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [receiver_email], msg.as_string())
        server.quit()
        print("郵件傳送成功！")
    except Exception as e:
        print("郵件傳送失敗：", e)
    return

def call_ai(model, user_prompt, default_prompt, max_token=1000):
    url = "http://localhost:8000/api/v1/chat/completions"

    prompt = user_prompt + default_prompt

    payload = {
        "model": model,  # 換成 UI 裡面列的可用 model
        "messages": [
            {"role": "user", "content": prompt}
        ]#,
        # "max_tokens":max_token
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

        # 嘗試從回傳資料取出文字
        if "choices" in data and len(data["choices"]) > 0:
            content = data["choices"][0]["message"]["content"]
            return {"result": str(content), "status_code":f"{response.status_code}"}
        else:
            return {"result": "No content in response", "status_code":f"{response.status_code}"}

    except Exception as e:
        # 確保無論如何 result 一定存在且是字串
        return {"result": "", "status_code":f"{response.status_code}", "error_message": f"Error: {str(e)}"}

def record_question(question, answer):
    """
    將問題和 AI 回覆記錄到 JSON 檔案中。
    """
    try:
        if os.path.exists(RECORD_FILE) and os.path.getsize(RECORD_FILE) > 0:
            with open(RECORD_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
        else:
            records = []
            
        new_record = {
            "question": question,
            "answer": answer
        }
        
        records.append(new_record)

        with open(RECORD_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=4, ensure_ascii=False)
            
        print(f"成功記錄新的一筆問答到 {RECORD_FILE}")

    except json.JSONDecodeError:
        print("警告：紀錄檔 JSON 格式不正確，正在重建檔案。")
        with open(RECORD_FILE, "w", encoding="utf-8") as f:
            json.dump([{"question": question, "answer": answer}], f, indent=4, ensure_ascii=False)

    except Exception as e:
        print(f"寫入紀錄檔失敗: {e}")
        
# ----------------------------------------------------------------------




# routing
# ----------------------------------------------------------------------

@app.route("/tech-ai", methods=["POST"])
def ask_detail():
    
    data = request.get_json()
    user_message = data.get("message", "")
    step = data.get("step", "")

    if not user_message:
        return jsonify({"error": "Did not receive user message."}), 400
    
    problem_steps = recent_question["translation_result"]
    problem_steps = json.load(problem_steps)
    
    step_content = problem_steps[step]
    
    prompt = """有一個AI幫助老人解決生活的科技相關問題，並將步驟分為細項。你是一個輔助角色，幫忙針對使用者有問題的步驟做出回應。你需要用簡單易懂的文字來回應使用者。
    問題背景:
        使用者原始問題:""" + recent_question['user_message'] + """
        AI回應步驟:""" + recent_question['translation_result'] + """
    你需要針對以下內容作回應:
        使用者有問題的步驟:""" + step_content +"""
        使用者新的問題:""" + user_message
    
    response_json = call_ai(model="gpt-oss-20b-mxfp4-GGUF", user_prompt="", default_prompt=prompt)
    response = response_json['result']

    if response_json['status_code'] == "200":
        return jsonify({"reply":response, "status":"success"})
    else:
        return jsonify({"reply": "This is /tech-ai testing."})
    

@app.route("/ai", methods=["POST"])
def chat_with_ai():
    
    data = request.get_json()
    user_message = data.get("message", "")
    print("收到使用者訊息:", user_message)
    
    if not user_message:
        return jsonify({"error": "沒有收到使用者訊息"}), 400

    # classifier
    # ----------------------------------------------------------------------
    
    default_prompt_classifier = """
    判斷以下文句是否是科技相關問題。例如：「我該怎麼使用藍牙連接滑鼠?」
    如果是科技相關問題，回答"1"
    否則回答"0"。
    你只能回答"1"或"0"
    不能包含其他文字
    """
    classify_result_json = call_ai("Mistral-7B-v0.3-Instruct-Hybrid", user_message, default_prompt_classifier, 500)
    classify_result = classify_result_json['result']

    if classify_result_json['status_code'] != "200":
        classify_result = "2"
    
    print(f"Classify result: "+classify_result)
    
    # condition branch
    # ----------------------------------------------------------------------
    if "2" in classify_result:
    
    # server off-line, frontend-backend intergration

        reply = """{"1":"打開設定", "2":"點進wifi欄位", "3":"連接Wifi", "4":"聯絡你兒子"}"""
        class_re = "1"
        return jsonify({"reply":reply, "class":class_re})


    elif "1" in classify_result:
        
    # tech-support problem
        
        # instruction generate
        # ----------------------------------------------------------------------
        default_prompt_instruction = """
        (你是一個給予科技輔助的幫手，幫助用戶解決生活上的科技問題。你需要將解決方法拆分成一個個詳細的小步驟。
        範例回應:
        步驟1: ......
        步驟2: ......)"""
        instruction_result_json = call_ai("Mistral-7B-v0.3-Instruct-Hybrid", user_message, default_prompt_instruction)
        instruction_result = instruction_result_json['result']
        
        print("Instructions: \n" + instruction_result)
        
        # elderly translation
        # ----------------------------------------------------------------------
        default_prompt_translation = """
        (你是一個老人科技助手，將以下的指引詳細又易讀的指示，讓使用者能跟著步驟解決問題。你也可以用較為有趣易懂的方法作為指引。
        例如：「打開設定」變成「找到設定，看起來是灰灰的齒輪，按下去」
        生成只含步驟的文檔, 並以步驟作為指引, 回傳一個以下的回覆。
        範例回應：
        {
        "1": "找到設定，看起來是灰灰的齒輪，按下去"
        "2": "......."
        ......
        })"""
        translation_result_json = call_ai("Mistral-7B-v0.3-Instruct-Hybrid", instruction_result, default_prompt_translation)
        translation_result = translation_result_json['result']
        
        print("Translation result: \n"+translation_result)
        
        record_question(question=user_message, answer=translation_result)
        
        recent_question["user_message"] = user_message
        recent_question["translation_result"] = translation_result
        
        return jsonify({"reply":translation_result, "class":"1"})
        
    else:
        
    # general chat
        
        # instruction generate
        # ----------------------------------------------------------------------
        default_prompt_chat = "(你是一個老人的跟老人聊天的聊天機器人，用簡單易懂的文字給予老人情緒價值)"
        chat_result_json = call_ai("Mistral-7B-v0.3-Instruct-Hybrid", user_message, default_prompt_chat)
        chat_result = chat_result_json['result']
        
        print("Chat message: "+chat_result)
        
        record_question(question=user_message, answer=chat_result)
        
        return jsonify({"reply":chat_result, "class":"0"})
        
    
@app.route("/change_email_address", methods=["POST"])
def change_address():
    data = request.get_json()
    new_email = data.get("new_email", "")
    target_email = new_email
    print(f"Updated email address. New address: {target_email}")
    return jsonify({"status":"success"})

@app.route("/send_email", methods=["POST"])
def send_email():
    data = request.get_json()
    target_email = data.get("email", "")
    
    with open('questions_record.json', 'r', encoding='utf-8') as file:  # 使用 json.load() 從檔案中讀取並解析
        json_data = json.load(file)
    questions_list = [("user question: "+item['question']) for item in json_data]

    # 將所有問題合併成一個單一的字串，並用換行符號隔開
    result_string = ' '.join(questions_list)

    default_prompt = """
    （你的名字是 CareAIde，你是一位為長者提供技術支援的助理，你應該自稱為 CareAIde。
    請根據上面的紀錄撰寫一份每日報告，以電子郵件的格式告訴使用者的子女，他們的父母今天詢問了什麼。）
    範例：
    親愛的先生/女士：
    （你的每日報告內容，只要內容，不需要問候語）
    祝您有美好的一天！
    CareAIde"""
    print(result_string)
    ai_response = call_ai("gpt-oss-20b-mxfp4-GGUF", result_string, default_prompt)

    if ai_response['status_code'] != "200":
        ai_response['result'] = """親愛的先生/女士\n這是一封測試郵件\n祝您有個美好的一天\nCareAIde"""

    send_report_email(target_email, "CareAIde Daily Report", ai_response['result'])

    print(ai_response['result'])
    return jsonify({"status": "success"})



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)