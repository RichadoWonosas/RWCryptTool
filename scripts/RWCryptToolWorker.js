"use-strict";

import { base64decode, base64encode } from "./Base64.js";
import { RWCFCreate, RWCFRead } from "./RWCF.js";
import { RWSE2Token } from "./RWSE2Token.js";
import { unicodeToUtf8, utf8ToUnicode } from "./UTF8Coding.js";

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

onmessage = (ev) => {
    try {
        switch (ev.data.code) {
            default:
                break;
            case COMMAND_CODE.ENCRYPT_FILE:
                encryptFile(ev.data.data);
                break;
            case COMMAND_CODE.DECRYPT_FILE:
                decryptFile(ev.data.data);
                break;
            case COMMAND_CODE.ENCRYPT_STRING:
                encryptString(ev.data.data);
                break;
            case COMMAND_CODE.DECRYPT_STRING:
                decryptString(ev.data.data);
                break;
        }
    } catch (e) {
        postMessage({
            code: RESPONSE_CODE.ERROR,
            data: e
        });
    }
};

function encryptFile(data) {
    try {
        let response = {
            code: RESPONSE_CODE.FILE_ENCRYPTED,
            data: RWCFCreate(
                data.bin,
                data.file_name,
                data.token,
                data.sec_param,
                data.mode,
                (prog) => postMessage({
                    code: RESPONSE_CODE.FILE_ENCRYPTING,
                    data: prog
                })
            )
        };
        postMessage(response, [response.data.raw.buffer]);
    } catch (e) {
        throw e;
    }
}

function decryptFile(data) {
    try {
        let response = {
            code: RESPONSE_CODE.FILE_DECRYPTED,
            data: RWCFRead(
                data.bin,
                data.token,
                (prog) => postMessage({
                    code: RESPONSE_CODE.FILE_DECRYPTING,
                    data: prog
                })
            )
        };
        postMessage(response, [response.data.data.buffer]);
    } catch (e) {
        throw e;
    }
}

function encryptString(data) {
    try {
        let raw_message = unicodeToUtf8(data.message);
        let salt = new Uint8Array(16);
        crypto.getRandomValues(salt);

        RWSE2Token(
            raw_message,
            data.token,
            salt,
            data.sec_param,
            data.mode,
            (prog) => postMessage({
                code: RESPONSE_CODE.STRING_ENCRYPTING,
                data: prog
            })
        );
        let new_message = new Uint8Array(raw_message.length + 16);
        new_message.set(salt);
        new_message.set(raw_message, 16);

        let response = {
            code: RESPONSE_CODE.STRING_ENCRYPTED,
            data: base64encode(new_message)
        };

        postMessage(response);
    } catch (e) {
        throw (e);
    }
}

function decryptString(data) {
    try {
        let raw_message = base64decode(data.message);
        let salt = raw_message.subarray(0, 16);
        let orig_message = raw_message.subarray(16);

        RWSE2Token(
            orig_message,
            data.token,
            salt,
            data.sec_param,
            data.mode,
            (prog) => postMessage({
                code: RESPONSE_CODE.STRING_DECRYPTING,
                data: prog
            })
        );

        let response = {
            code: RESPONSE_CODE.STRING_DECRYPTED,
            data: utf8ToUnicode(orig_message)
        };

        postMessage(response);
    } catch (e) {
        throw e;
    }
}