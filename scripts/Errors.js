"use strict";

export { CustomError };

class CustomError extends Error {
    #error_code;

    get error_code() {
        return this.#error_code;
    }

    constructor(error_code, error_msg) {
        super(error_msg);
        this.#error_code = error_code;
    }
}