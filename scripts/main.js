"use-strict";

import { RWSE2_OPER } from "./RWSE2.js";
import { RWSE2_MODE, RWSE2_OPT } from "./RWSE2Token.js";
import { RWSH, RWSH_TYPE } from "./RWSH.js";

// Initialise

// Constants
const COMMAND_CODE = {
    ENCRYPT_FILE: 0,
    DECRYPT_FILE: 1,
    ENCRYPT_STRING: 2,
    DECRYPT_STRING: 3
};

const RESPONSE_CODE = {
    FILE_ENCRYPTING: 0,
    FILE_ENCRYPTED: 1,
    FILE_DECRYPTING: 2,
    FILE_DECRYPTED: 3,
    STRING_ENCRYPTING: 4,
    STRING_ENCRYPTED: 5,
    STRING_DECRYPTING: 6,
    STRING_DECRYPTED: 7,
    ERROR: 8
};

const MESSAGE_TYPE = {
    STRING_MESSAGE: 0,
    FILE_MESSAGE: 1
}

// Variables
var worker;
var input_type = MESSAGE_TYPE.STRING_MESSAGE;
var setting = true;

// DOM Elements
const button_string_crypt = document.getElementById("string_crypt");
const button_file_crypt = document.getElementById("file_crypt");

const element_oper_encrypt = document.getElementById("oper_encrypt");
const element_oper_decrypt = document.getElementById("oper_decrypt");

const element_input_text = document.getElementById("input_text");
const element_output_text = document.getElementById("output_text");
const element_upload_button = document.getElementById("upload_button");

const element_file_name = document.getElementById("file_name");
const element_file_chooser = document.createElement("input");
element_file_chooser.type = "file";

const element_download_output = document.getElementById("download_output");
const element_download_link = document.createElement("a");
element_download_link.href = "";
element_download_link.download = "";

const choice_crypt_method = document.getElementById("crypt_method");
const choice_crypt_mode = document.getElementById("crypt_operation_mode");
const button_reset = document.getElementById("element_reset");

const element_password = document.getElementById("password");
const element_param_config = document.getElementById("param_config");
const element_config_show = document.getElementById("config_show");

const element_show_type = document.getElementById("show_crypt_type");

const reader = new FileReader();

// Bind functions to elements
button_string_crypt.onclick = () => changeInputMode(MESSAGE_TYPE.STRING_MESSAGE);
button_file_crypt.onclick = () => changeInputMode(MESSAGE_TYPE.FILE_MESSAGE);
element_upload_button.onclick = () => activateFileReader();
element_file_chooser.onchange = () => readChangedFiles();
element_config_show.onclick = () => changeSetting();
choice_crypt_method.onchange = () => refresh();
choice_crypt_mode.onchange = () => refresh();
button_reset.onclick = () => {
    refresh();
    element_show_type.innerText = "RWSE2_256_CTR_RWXH256";
};
element_oper_encrypt.onclick = () => startCrypt(RWSE2_OPER.OPER_ENCRYPT);
element_oper_decrypt.onclick = () => startCrypt(RWSE2_OPER.OPER_DECRYPT);
element_download_output.onclick = () => download();

// Set reader
reader.onloadstart = () => {
    element_upload_button.innerText = "读取中...";
    element_upload_button.disabled = true;
    element_oper_encrypt.disabled = true;
    element_oper_decrypt.disabled = true;
    button_file_crypt.disabled = true;
    button_string_crypt.disabled = true;
    element_upload_button.classList.add("reading");
    element_file_name.innerText = "读取中...\t" + element_file_chooser.files[0].name;
};
reader.onprogress = (e) => {
    let ratio = e.loaded / e.total;
    renderButton(ratio, element_upload_button, "读取中...");
};
reader.onloadend = () => {
    element_upload_button.innerText = "打开文件...";
    element_file_name.innerText = element_file_chooser.files[0].name;
    element_oper_encrypt.disabled = false;
    element_oper_decrypt.disabled = false;
    button_file_crypt.disabled = false;
    button_string_crypt.disabled = false;
    endReading();
};

// Set worker
if (window.Worker) {
    worker = new Worker("./scripts/RWCryptToolWorker.js", {
        type: "module"
    });
    worker.onmessage = (ev) => {
        let b, url;
        switch (ev.data.code) {
            default:
                break;
            case RESPONSE_CODE.FILE_ENCRYPTING:
                renderButton(ev.data.data, element_download_output, "加密中...");
                break;
            case RESPONSE_CODE.FILE_DECRYPTING:
                renderButton(ev.data.data, element_download_output, "解密中...");
                break;
            case RESPONSE_CODE.STRING_ENCRYPTING:
                element_output_text.value = "加密中...\t" + (ev.data.data * 100).toFixed(2) + "%";
                break;
            case RESPONSE_CODE.STRING_DECRYPTING:
                element_output_text.value = "解密中...\t" + (ev.data.data * 100).toFixed(2) + "%";
                break;
            case RESPONSE_CODE.FILE_ENCRYPTED:
                b = new Blob([ev.data.data.raw]);
                url = URL.createObjectURL(b);
                element_download_link.href = url;
                element_download_link.download = element_file_chooser.files[0].name + ".rwcf";
                changeButtonStatus(false);
                element_download_output.classList.remove("reading");
                element_download_output.classList.add("ready");
                element_download_output.innerText = "下载文件...";
                element_download_output.style.backgroundColor = "";
                element_download_output.style.color = "";
                break;
            case RESPONSE_CODE.FILE_DECRYPTED:
                b = new Blob([ev.data.data.data]);
                url = URL.createObjectURL(b);
                element_download_link.href = url;
                element_download_link.download = ev.data.data.file_name;
                changeButtonStatus(false);
                element_download_output.classList.remove("reading");
                element_download_output.classList.add("ready");
                element_download_output.innerText = "下载文件...";
                element_download_output.style.backgroundColor = "";
                element_download_output.style.color = "";
                break;
            case RESPONSE_CODE.STRING_ENCRYPTED:
            case RESPONSE_CODE.STRING_DECRYPTED:
                element_output_text.value = ev.data.data;
                changeButtonStatus(false);
                break;
            case RESPONSE_CODE.ERROR:
        }
    }
} else {
    alert("警告：您的浏览器不支持本套件！");
    window.close();
}

// Calculate page hash
{
    let content = document.documentElement.outerHTML;
    let raw_result = new RWSH(RWSH_TYPE.RWSH256).absorb(content).digest();
    let result = Array.from(raw_result).map(value => value.toString(16).padStart(2, "0")).join("");
    document.getElementById("foot_text").innerText = "RichadoWonosas 2023 || RWSH256: " + result;
}

changeInputMode(input_type);
changeSetting();

// Interaction

function endReading() {
    element_upload_button.style.color = "#ffffff";
    setTimeout(() => {
        element_upload_button.style.backgroundColor = "#66cc66";
        element_upload_button.style.color = "#ffffff";
    }, 150);
    setTimeout(() => {
        element_upload_button.style.backgroundColor = "#eeeeee";
        element_upload_button.style.color = "#666666";
    }, 450);
    setTimeout(() => {
        element_upload_button.classList.remove("reading");
        element_upload_button.disabled = false;
        element_upload_button.style.backgroundColor = "";
        element_upload_button.style.color = "";
    }, 600);
}

function readChangedFiles() {
    reader.abort();

    element_download_output.disabled = true;
    element_download_output.classList.remove("ready");
    element_download_output.classList.add("loading");
    element_download_output.innerText = "无输出文件";

    if (element_file_chooser.files.length == 0) {
        element_oper_encrypt.disabled = true;
        element_oper_decrypt.disabled = true;
    } else {
        element_oper_encrypt.disabled = false;
        element_oper_decrypt.disabled = false;
        reader.readAsArrayBuffer(element_file_chooser.files[0]);
    }
}

function activateFileReader() {
    element_file_name.innerText = ("未选择文件");
    element_file_chooser.click();
}

function download() {
    element_download_link.click();
}

function renderButton(ratio, button, text) {
    button.innerText = text + "\t" + (100 * ratio).toFixed(2) + "%";
    button.style.backgroundColor =
        "#" +
        Math.floor(0x66 * ratio + 0xee * (1 - ratio)).toString(16) +
        Math.floor(0xcc * ratio + 0xee * (1 - ratio)).toString(16) +
        Math.floor(0x66 * ratio + 0xee * (1 - ratio)).toString(16);
    if (ratio > 0.5) {
        button.style.color = "#ffffff";
    } else {
        button.style.color = "#666666";
    }
}

function refresh() {
    let length, mode;
    switch (choice_crypt_method.selectedIndex) {
        default:
        case 0:
            length = "256";
            break;
        case 1:
            length = "512";
            break;
    }

    switch (choice_crypt_mode.selectedIndex) {
        default:
        case 0:
            mode = "CTR";
            break;
        case 1:
            mode = "OFB";
            break;
    }
    element_show_type.innerText = "RWSE2_" + length + "_" + mode + "_RWXH" + length;
    if (input_type != 0) {
        readChangedFiles();
    }
}

function changeButtonStatus(status) {
    button_string_crypt.disabled = status;
    button_file_crypt.disabled = status;
    element_input_text.disabled = status;
    element_upload_button.disabled = status;
    element_password.disabled = status;
    element_oper_encrypt.disabled = status;
    element_oper_decrypt.disabled = status;
    element_output_text.disabled = status;
    element_download_output.disabled = status;
}

function startCrypt(operation) {
    if (window.Worker) {
        let result = { data: {} };
        let transfer = [];

        changeButtonStatus(true);

        result.data.token = element_password.innerText;
        switch (choice_crypt_method.selectedIndex) {
            default:
            case 0:
                result.data.sec_param = RWSE2_OPT.OPT_256;
                break;
            case 1:
                result.data.sec_param = RWSE2_OPT.OPT_512;
                break;
        }

        switch (choice_crypt_mode.selectedIndex) {
            default:
            case 0:
                result.data.mode = RWSE2_MODE.CTR;
                break;
            case 1:
                result.data.mode = RWSE2_MODE.OFB;
                break;
        }

        if (input_type == MESSAGE_TYPE.STRING_MESSAGE) {
            result.code = (operation == RWSE2_OPER.OPER_ENCRYPT) ? COMMAND_CODE.ENCRYPT_STRING : COMMAND_CODE.DECRYPT_STRING;
            result.data.message = element_input_text.value;
        } else {
            result.code = (operation == RWSE2_OPER.OPER_ENCRYPT) ? COMMAND_CODE.ENCRYPT_FILE : COMMAND_CODE.DECRYPT_FILE;
            result.data.file_name = element_file_chooser.files[0].name;
            result.data.bin = new Uint8Array(reader.result);
            transfer.push(reader.result);
        }

        worker.postMessage(result, transfer);
    } else {
        alert("警告：您的浏览器不支持本应用！");
    }
}

function changeViewByInputMode() {
    let elements = document.getElementsByClassName("input_type");
    for (let i = 0; i < elements.length; i++) {
        if (elements.item(i).value != input_type) {
            elements.item(i).classList.remove("selected");
        } else {
            elements.item(i).classList.add("selected");
        }
    }

    switch (input_type) {
        default:
        case MESSAGE_TYPE.STRING_MESSAGE:
            element_input_text.hidden = false;
            element_output_text.hidden = false;
            element_input_text.style.opacity = 1.0;
            element_output_text.style.opacity = 1.0;

            element_oper_encrypt.disabled = false;
            element_oper_decrypt.disabled = false;

            element_upload_button.hidden = true;
            element_file_name.hidden = true;
            element_download_output.hidden = true;
            element_upload_button.style.opacity = 0.0;
            element_file_name.style.opacity = 0.0;
            element_download_output.style.opacity = 0.0;
            break;

        case MESSAGE_TYPE.FILE_MESSAGE:
            element_input_text.hidden = true;
            element_output_text.hidden = true;
            element_input_text.style.opacity = 0.0;
            element_output_text.opacity = 0.0;

            if (element_file_chooser.files.length == 0) {
                element_oper_encrypt.disabled = true;
                element_oper_decrypt.disabled = true;
                element_download_output.classList.remove("ready");
                element_download_output.classList.add("loading");
                element_download_output.disabled = true;
                element_download_output.innerText = "无输出文件";
            }

            element_upload_button.hidden = false;
            element_file_name.hidden = false;
            element_download_output.hidden = false;
            element_upload_button.style.opacity = 1.0;
            element_file_name.style.opacity = 1.0;
            element_download_output.style.opacity = 1.0;
            break;
    }
}

function changeSetting() {
    setting = !setting;
    if (setting) {
        element_param_config.hidden = false;
        element_config_show.innerText = "收起";
    } else {
        element_param_config.hidden = true;
        element_config_show.innerText = "设置";
    }
}

function changeInputMode(value) {
    input_type = value;
    changeViewByInputMode();
}