"use strict";

import {RWSH, RWSH_TYPE} from "./RWSH.js";
import {helper} from "https://richadowonosas.github.io/scripts/helper.js";

// Initialise

// Constants
const RWSE2_OPER = {
    OPER_ENCRYPT: 0,
    OPER_DECRYPT: 1
};

const RWSE2_MODE = {
    CTR: 0,
    OFB: 1
};

const RWSE2_OPT = {
    OPT_256: 0,
    OPT_384: 1,
    OPT_512: 2
};

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
    STRING_MESSAGE: "0",
    FILE_MESSAGE: "1"
};

const READER_STATE = {
    IDLE: 0,
    LOADING: 1,
    LOADED: 2
};

const CRYPT_STATE = {
    IDLE: 0,
    PROCESSING: 1,
    FINISHED: 2,
}

// Variables
let worker;
let input_type = MESSAGE_TYPE.STRING_MESSAGE;
let setting = true;
const strings = {
    loading: "读取中...",
    upload_button: "打开文件...",
    download_output: "无输出文件",
    no_file_chosen: "未选择文件",
    warning: "警告：您的浏览器不支持本应用！",
    expand: "展开",
    collapse: "收起",
    save_file: "保存文件...",
    encrypting: "加密中...",
    decrypting: "解密中..."
};
const params = {
    light: {
        bg_color: [
            {pivot: 1, color: [0x66, 0xee, 0x66]},
            {pivot: 0, color: [0xee, 0xee, 0xee]}
        ],
        fg_color: [
            {threshold: 0.5, value: "#ffffff"},
            {threshold: 0, value: "#666666"}
        ],
        bgc: ["#66cc66", "#eeeeee"],
        fgc: ["#ffffff", "#666666"]
    },
    dark: {
        bg_color: [
            {pivot: 1, color: [0x33, 0x99, 0x33]},
            {pivot: 0, color: [0x33, 0x33, 0x33]}
        ],
        fg_color: [
            {threshold: 0, value: "#cccccc"}
        ],
        bgc: ["#009900", "#333333"],
        fgc: ["#cccccc", "#cccccc"]
    },
    cur: "light"
};
const state = {
    reader: READER_STATE.IDLE,
    crypt: CRYPT_STATE.IDLE
};

// DOM Elements
const root_div = document.getElementById("root_div");
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

// Interaction

function endReading() {
    let scheme = params[params.cur];
    state.reader = READER_STATE.LOADED;
    state.crypt = CRYPT_STATE.IDLE;
    element_upload_button.style.color = scheme.fgc[0];
    setTimeout(() => {
        element_upload_button.style.backgroundColor = scheme.bgc[0];
        element_upload_button.style.color = scheme.fgc[0];
    }, 150);
    setTimeout(() => {
        element_upload_button.style.backgroundColor = scheme.bgc[1];
        element_upload_button.style.color = scheme.fgc[1];
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

    state.reader = READER_STATE.LOADING;
    element_download_output.disabled = true;
    element_download_output.classList.remove("ready");
    element_download_output.classList.add("loading");
    element_download_output.innerText = strings.download_output;

    if (element_file_chooser.files.length === 0) {
        element_oper_encrypt.disabled = true;
        element_oper_decrypt.disabled = true;
    } else {
        element_oper_encrypt.disabled = false;
        element_oper_decrypt.disabled = false;
        reader.readAsArrayBuffer(element_file_chooser.files[0]);
    }
}

function activateFileReader() {
    state.reader = READER_STATE.IDLE;
    element_file_name.innerText = strings.no_file_chosen;
    element_file_chooser.click();
}

function download() {
    element_download_link.click();
}

function renderButton(ratio, button, text) {
    button.innerText = text + "\t" + (100 * ratio).toFixed(2) + "%";
    let i = 1, scheme = params[params.cur];
    while (ratio < scheme.bg_color[i].pivot)
        i++;
    button.style.backgroundColor =
        `#${
            Math.floor((scheme.bg_color[i - 1].color[0] * (ratio - scheme.bg_color[i].pivot) +
                scheme.bg_color[i].color[0] * (scheme.bg_color[i - 1].pivot - ratio)) /
                (scheme.bg_color[i - 1].pivot - scheme.bg_color[i].pivot))
                .toString(16).padStart(2, "0")
        }${
            Math.floor((scheme.bg_color[i - 1].color[1] * (ratio - scheme.bg_color[i].pivot) +
                    scheme.bg_color[i].color[1] * (scheme.bg_color[i - 1].pivot - ratio)) /
                (scheme.bg_color[i - 1].pivot - scheme.bg_color[i].pivot))
                .toString(16).padStart(2, "0")
        }${
            Math.floor((scheme.bg_color[i - 1].color[2] * (ratio - scheme.bg_color[i].pivot) +
                    scheme.bg_color[i].color[2] * (scheme.bg_color[i - 1].pivot - ratio)) /
                (scheme.bg_color[i - 1].pivot - scheme.bg_color[i].pivot))
                .toString(16).padStart(2, "0")
        }`;
    for (i = 0; i < scheme.fg_color.length; i++)
        if (ratio >= scheme.fg_color[i].threshold) {
            button.style.color = scheme.fg_color[i].value;
            break;
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
    if (input_type === MESSAGE_TYPE.FILE_MESSAGE) {
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
        let result = {data: {}};
        let transfer = [];

        state.crypt = CRYPT_STATE.PROCESSING;
        changeButtonStatus(true);

        result.data.token = element_password.value;
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

        if (input_type === MESSAGE_TYPE.STRING_MESSAGE) {
            result.code = (operation === RWSE2_OPER.OPER_ENCRYPT) ? COMMAND_CODE.ENCRYPT_STRING : COMMAND_CODE.DECRYPT_STRING;
            result.data.message = element_input_text.value;
        } else {
            result.code = (operation === RWSE2_OPER.OPER_ENCRYPT) ? COMMAND_CODE.ENCRYPT_FILE : COMMAND_CODE.DECRYPT_FILE;
            result.data.file_name = element_file_chooser.files[0].name;
            result.data.bin = new Uint8Array(reader.result.byteLength);
            result.data.bin.set(new Uint8Array(reader.result));
            transfer.push(result.data.bin.buffer);
        }

        worker.postMessage(result, transfer);
    } else {
        alert(strings.warning);
    }
}

function changeViewByInputMode() {
    let elements = document.getElementsByClassName("input_type");
    for (let i = 0; i < elements.length; i++) {
        if (elements.item(i).value !== input_type) {
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
            element_input_text.style.opacity = "1";
            element_output_text.style.opacity = "1";

            element_oper_encrypt.disabled = false;
            element_oper_decrypt.disabled = false;

            element_upload_button.hidden = true;
            element_file_name.hidden = true;
            element_download_output.hidden = true;
            element_upload_button.style.opacity = "0";
            element_file_name.style.opacity = "0";
            element_download_output.style.opacity = "0";
            break;

        case MESSAGE_TYPE.FILE_MESSAGE:
            element_input_text.hidden = true;
            element_output_text.hidden = true;
            element_input_text.style.opacity = "0";
            element_output_text.opacity = 0.0;

            if (element_file_chooser.files.length === 0) {
                element_oper_encrypt.disabled = true;
                element_oper_decrypt.disabled = true;
                element_download_output.classList.remove("ready");
                element_download_output.classList.add("loading");
                element_download_output.disabled = true;
                element_download_output.innerText = strings.download_output;
            }

            element_upload_button.hidden = false;
            element_file_name.hidden = false;
            element_download_output.hidden = false;
            element_upload_button.style.opacity = "1";
            element_file_name.style.opacity = "1";
            element_download_output.style.opacity = "1";
            break;
    }
}

function changeSetting() {
    setting = !setting;
    if (setting) {
        element_param_config.hidden = false;
        element_config_show.innerText = strings.collapse;
    } else {
        element_param_config.hidden = true;
        element_config_show.innerText = strings.expand;
    }
}

function changeInputMode(value) {
    input_type = value;
    changeViewByInputMode();
}

const initElements = () => {
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
        element_upload_button.innerText = strings.loading;
        element_upload_button.disabled = true;
        element_oper_encrypt.disabled = true;
        element_oper_decrypt.disabled = true;
        button_file_crypt.disabled = true;
        button_string_crypt.disabled = true;
        element_upload_button.classList.add("reading");
        element_file_name.innerText = strings.loading + "\t" + element_file_chooser.files[0].name;
    };
    reader.onprogress = (e) => {
        let ratio = e.loaded / e.total;
        renderButton(ratio, element_upload_button, strings.loading);
    };
    reader.onloadend = () => {
        element_upload_button.innerText = strings.upload_button;
        element_file_name.innerText = element_file_chooser.files[0].name;
        element_oper_encrypt.disabled = false;
        element_oper_decrypt.disabled = false;
        button_file_crypt.disabled = false;
        button_string_crypt.disabled = false;
        endReading();
    };

    // Calculate page hash
    {
        let content = document.documentElement.outerHTML;
        let raw_result = new RWSH(RWSH_TYPE.RWSH256).absorb(content).digest();
        let result = Array.from(raw_result).map(value => value.toString(16).padStart(2, "0")).join("");
        document.getElementById("foot_text").innerText = "RichadoWonosas 2023 || RWSH256: " + result;
    }
}

const initWorker = () => {
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
                    renderButton(ev.data.data, element_download_output, strings.encrypting);
                    break;
                case RESPONSE_CODE.FILE_DECRYPTING:
                    renderButton(ev.data.data, element_download_output, strings.decrypting);
                    break;
                case RESPONSE_CODE.STRING_ENCRYPTING:
                    element_output_text.value = strings.encrypting + "\t" + (ev.data.data * 100).toFixed(2) + "%";
                    break;
                case RESPONSE_CODE.STRING_DECRYPTING:
                    element_output_text.value = strings.decrypting + "\t" + (ev.data.data * 100).toFixed(2) + "%";
                    break;
                case RESPONSE_CODE.FILE_ENCRYPTED:
                    state.crypt = CRYPT_STATE.FINISHED;
                    b = new Blob([ev.data.data.raw]);
                    url = URL.createObjectURL(b);
                    element_download_link.href = url;
                    element_download_link.download = element_file_chooser.files[0].name + ".rwcf";
                    changeButtonStatus(false);
                    element_download_output.classList.remove("reading");
                    element_download_output.classList.add("ready");
                    element_download_output.innerText = strings.save_file;
                    element_download_output.style.backgroundColor = "";
                    element_download_output.style.color = "";
                    break;
                case RESPONSE_CODE.FILE_DECRYPTED:
                    state.crypt = CRYPT_STATE.FINISHED;
                    b = new Blob([ev.data.data.data]);
                    url = URL.createObjectURL(b);
                    element_download_link.href = url;
                    element_download_link.download = ev.data.data.file_name;
                    changeButtonStatus(false);
                    element_download_output.classList.remove("reading");
                    element_download_output.classList.add("ready");
                    element_download_output.innerText = strings.save_file;
                    element_download_output.style.backgroundColor = "";
                    element_download_output.style.color = "";
                    break;
                case RESPONSE_CODE.STRING_ENCRYPTED:
                case RESPONSE_CODE.STRING_DECRYPTED:
                    state.crypt = CRYPT_STATE.FINISHED;
                    element_output_text.value = ev.data.data;
                    changeButtonStatus(false);
                    break;
                case RESPONSE_CODE.ERROR:
                    alert(`Error: ${ev.data.data}`)
                    changeButtonStatus(false);
            }
        }
    } else {
        alert(strings.warning);
        window.close();
    }
};

const initSettings = () => {
    changeInputMode(input_type);
    changeSetting();
    helper.addEventListener("size", "root", (res) => {
        if (res.size === 'small') {
            root_div.classList.add('small');
        } else {
            root_div.classList.remove('small');
        }
        if (res.size === 'medium') {
            root_div.classList.add('medium');
        } else {
            root_div.classList.remove('medium');
        }
        if (res.size === 'large') {
            root_div.classList.add('large');
        } else {
            root_div.classList.remove('large');
        }
    });
    helper.addEventListener("light", "scheme", (res) => {
        params.cur = res.light ? "light" : "dark";
    });
};

const initLocale = () => {
    helper.importTranslation(document.URL.split("/").slice(0, -1).join("/") + "/resources/localized-strings.json");
    helper.addEventListener("locale", "title", (res) => document.getElementById("title_doc").innerText = document.title = res.str);
    for (let entry in strings)
        helper.addEventListener("locale", entry, (res) => strings[entry] = res.str);
    helper.addEventListener("locale", "string_crypt", (res) => button_string_crypt.innerText = res.str);
    helper.addEventListener("locale", "file_crypt", (res) => button_file_crypt.innerText = res.str);
    helper.addEventListener("locale", "title_input", (res) => document.getElementById("title_input").innerText = res.str);
    helper.addEventListener("locale", "title_content", (res) => document.getElementById("title_content").innerText = res.str);
    helper.addEventListener("locale", "input_text", (res) => element_input_text.placeholder = res.str);
    helper.addEventListener("locale", "title_password", (res) => document.getElementById("title_password").innerText = res.str);
    helper.addEventListener("locale", "password", (res) => document.getElementById("password").placeholder = res.str);
    helper.addEventListener("locale", "title_crypt_type", (res) => document.getElementById("title_crypt_type").innerText = res.str);
    helper.addEventListener("locale", "title_param", (res) => document.getElementById("title_param").innerText = res.str);
    helper.addEventListener("locale", "title_sec", (res) => document.getElementById("title_sec").innerText = res.str);
    helper.addEventListener("locale", "opt_256", (res) => document.getElementById("opt_256").innerText = res.str);
    helper.addEventListener("locale", "opt_512", (res) => document.getElementById("opt_512").innerText = res.str);
    helper.addEventListener("locale", "title_mode", (res) => document.getElementById("title_mode").innerText = res.str);
    helper.addEventListener("locale", "element_reset", (res) => button_reset.innerText = res.str);
    helper.addEventListener("locale", "oper_encrypt", (res) => element_oper_encrypt.innerText = res.str);
    helper.addEventListener("locale", "oper_decrypt", (res) => element_oper_decrypt.innerText = res.str);
    helper.addEventListener("locale", "title_output", (res) => document.getElementById("title_output").innerText = res.str);
    helper.addEventListener("locale", "output_text", (res) => element_output_text.placeholder = res.str);

    helper.addEventListener("localeChanged", "sum", () => {
        element_config_show.innerText = element_param_config.hidden ? strings.expand : strings.collapse;
        switch (state.reader) {
            case READER_STATE.IDLE:
                element_upload_button.innerText = strings.upload_button;
                element_file_name.innerText = strings.no_file_chosen;
                break;
            case READER_STATE.LOADING:
                element_file_name.innerText = strings.loading + "\t" + element_file_chooser.files[0].name;
                break;
            case READER_STATE.LOADED:
                element_upload_button.innerText = strings.upload_button;
                break;
        }
        switch (state.crypt) {
            case CRYPT_STATE.IDLE:
                element_download_output.innerText = strings.download_output;
                break;
            case CRYPT_STATE.PROCESSING:
                break;
            case CRYPT_STATE.FINISHED:
                element_download_output.innerText = strings.save_file;
                break;
        }
    })
}

const initialize = () => {
    initElements();
    initWorker();
    initSettings();
    initLocale();
    helper.loadGlobalConfig();
    helper.drawer.appendToDocument();
};

initialize();

