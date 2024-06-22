"use strict";

import { CustomError } from "./Errors.js";
export { utf8ToUnicode, unicodeToUtf8 };

function unicodeToUtf8(code) {
    return new Uint8Array(
        encodeURIComponent(code)
            .split(new RegExp("(%[0-9A-Fa-f]{2}|\\S)"))
            .filter(value => value !== "")
            .map(value => (value.charAt(0) === "%") ? parseInt(value.substring(1), 16) : value.charCodeAt(0))
    );
}

function utf8ToUnicode(code) {
    try {
        return decodeURIComponent(
            Array.from(code).map(value => ("%" + value.toString(16).padStart(2, "0"))).join("")
        );
    } catch (error) {
        throw new CustomError(-4, "Illegal unicode");
    }
}