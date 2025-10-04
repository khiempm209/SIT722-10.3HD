import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import tempfile

BASE_URL = "_FRONTEND_SERVICE_URL_"
first_message, second_message = "Hello", "Give me some information about Blackmore products"
test_account_username = "test_account"
test_account_password = "test_account"


@pytest.fixture(scope="module")
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    # options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-features=PasswordLeakDetection,PasswordManagerOnboarding")
    options.add_argument("--disable-save-password-bubble")
    prefs = {
        "credentials_enable_service": False,
        "profile.password_manager_enabled": False,
        "profile.password_manager_leak_detection": False,
        "credentials_enable_autosignin": False
    }
    options.add_experimental_option("prefs", prefs)
    tmp_profile = tempfile.mkdtemp()
    options.add_argument(f"--user-data-dir={tmp_profile}")
    options.add_argument('--headless')
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()

def test_login(driver):
    driver.get(f"{BASE_URL}")
    time.sleep(2)
    signup_input = driver.find_element(By.ID, 'showLoginBtn')
    assert signup_input is not None, ("The website does not have a login button")
    signup_input.click()
    time.sleep(2)
    signupForm = driver.find_element(By.ID, "authForm")
    assert signupForm is not None, ("The login page dose not have the signup form")
    signupForm.find_element(By.ID, "authUsername").send_keys(test_account_username)
    signupForm.find_element(By.ID, "authPassword").send_keys(test_account_password)
    time.sleep(0.3)
    signupForm.find_element(By.ID, "switchMode").click()
    time.sleep(0.3)
    signupForm.find_element(By.ID, "authSubmit").click()
    time.sleep(1)
    if driver.find_element(By.ID, "authError").text == "User already exists. Please login.":
        signupForm.find_element(By.ID, "switchMode").click()
        time.sleep(0.3)
        signupForm.find_element(By.ID, "authSubmit").click()
        time.sleep(1)
    else:
        driver.find_element(By.ID, 'showLoginBtn').click()
        time.sleep(0.3)
        signupForm.find_element(By.ID, "switchMode").click()
        time.sleep(0.3)
        signupForm.find_element(By.ID, "authUsername").send_keys(test_account_username)
        signupForm.find_element(By.ID, "authPassword").send_keys(test_account_password)
        time.sleep(0.3)
        signupForm.find_element(By.ID, "authSubmit").click()
        time.sleep(1)
    assert driver.find_element(By.ID, "authArea").find_elements(By.CLASS_NAME, "auth-username")[0],  ("The login process failed")
    assert driver.find_element(By.ID, "authArea").find_elements(By.CLASS_NAME, "auth-username")[0].text == test_account_username,  ("Wrong username displayed")
    assert driver.find_element(By.ID, "homeInput").value_of_css_property("display") == "block",  ("The text area does not appear after the login process")


    
def test_chatbot_message(driver):
    driver.get(f"{BASE_URL}/chat")
    bot_message_text = "supplements"
    home_input = driver.find_element(By.ID, "homeInput")
    assert home_input is not None, ("The website does not have the home input")
    home_input.send_keys(first_message)
    time.sleep(1)
    home_button = driver.find_element(By.ID, "homeSend")
    assert home_button is not None, ("The website does not have the home button for sending messages")
    # home_button.click()
    driver.execute_script("arguments[0].click();", home_button)
    time.sleep(8)
    first_user_message = driver.find_elements(By.CSS_SELECTOR, ".message")[0]
    assert first_user_message.find_elements(By.CLASS_NAME, "meta")[0].text == "USER", ("Problem with the first user message - role")
    assert first_user_message.find_elements(By.CLASS_NAME, "body")[0].text == first_message, ("Problem with the first user message - text")
    first_bot_message = driver.find_elements(By.CSS_SELECTOR, ".message")[1]
    assert first_bot_message.find_elements(By.CLASS_NAME, "meta")[0].text == "BOT", ("Problem with the first bot message - role")
    assert bot_message_text in first_bot_message.find_elements(By.CLASS_NAME, "body")[0].text.lower(), \
           ("Problem with the first bot message - text")
    chat_input = driver.find_element(By.ID, "chatInput")
    assert chat_input is not None, ("The website does not have the chat input")
    chat_input.send_keys(second_message)
    chat_button = driver.find_element(By.ID, "chatSend")
    assert chat_button is not None, ("The website does not have the chat button for sending messages")
    chat_button.click()
    time.sleep(8)
    second_user_message = driver.find_elements(By.CSS_SELECTOR, ".message")[2]
    assert second_user_message.find_elements(By.CLASS_NAME, "meta")[0].text == "USER", ("Problem with the second user message - role")
    assert second_user_message.find_elements(By.CLASS_NAME, "body")[0].text == second_message, ("Problem with the second user message - text")
    second_bot_message = driver.find_elements(By.CSS_SELECTOR, ".message")[3]
    assert second_bot_message.find_elements(By.CLASS_NAME, "meta")[0].text == "BOT", ("Problem with the first bot message - bot")
    assert second_bot_message.find_elements(By.CLASS_NAME, "body")[0].text.lower() != "", ("Problem with the first bot message - bot")
    time.sleep(3)

def test_chatbot_conversation(driver):
    driver.get(f"{BASE_URL}/chat")
    time.sleep(1)
    conversations = driver.find_elements(By.CLASS_NAME, "conv")
    current_number = len(conversations)
    assert current_number != 0, ("Cannot create the conversation card")
    conversations[0].click()
    messages = driver.find_elements(By.CSS_SELECTOR, ".message")
    assert messages[0].find_elements(By.CLASS_NAME, "body")[0].text == first_message, ("Wrong user message display - 1")
    assert messages[2].find_elements(By.CLASS_NAME, "body")[0].text == second_message, ("Wrong user message display - 2")
    time.sleep(1)
    delete_button = conversations[0].find_elements(By.CLASS_NAME, 'trash-btn')[0]
    assert delete_button is not None, ("Cannot find the delete button in the conversation card")
    delete_button.click()
    time.sleep(1)
    alert = driver.switch_to.alert
    alert.accept()
    time.sleep(0.5)
    home_input = driver.find_element(By.ID, "homeInput")
    assert home_input is not None, ("The delete process is not working")
    assert current_number == len(driver.find_elements(By.CLASS_NAME, "conv")) + 1, ('The delete process does not delete the conversation card')



