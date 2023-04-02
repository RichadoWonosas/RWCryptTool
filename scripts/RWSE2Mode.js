"use-strict";

import { RWSE2_OPER, RWSE2_OPT, RWSE2_Key_Expand, RWSE2_Direct } from "./RWSE2.js";
export { RWSE2_OPER, RWSE2_OPT, CRYPT_MODE, RWSE2_OFB, RWSE2_CTR };

const CRYPT_MODE = {
    CTR: 0,
    OFB: 1
};

function RWSE2_OFB(content, key, iv, crypt_type, update_prog = (prog) => { }) {
    var length = content.length, finished = 0, rounds = ((content.length - 1) >>> 5) + 1;
    var reg = new Uint8Array(iv);
    let exkey = RWSE2_Key_Expand(key, RWSE2_OPER.OPER_ENCRYPT, crypt_type);

    let big_round = ((rounds - 1) >>> 9) + 1;
    let finished_big_round = 0;
    for (let i = 0; i < big_round; i++) {
        let this_round = (rounds - finished_big_round) > 512 ? 512 : (rounds - finished_big_round);

        for (let j = 0; j < this_round; j++) {
            let round_length = (length - finished) > 32 ? 32 : (length - finished);

            reg = RWSE2_Direct(reg, exkey);
            for (let k = 0; k < round_length; k++) {
                content[(((i << 9) | j) << 5) | k] ^= reg[k];
            }

            finished += round_length;
        }

        update_prog(finished / length);
        finished_big_round += this_round;
    }
}

function counter_add(counter) {
    let new_counter = new Uint8Array(counter);

    for (let i = new_counter.length - 1; i >= 0; i--) {
        new_counter[i]++;
        if (new_counter[i] > counter[i]) {
            break;
        }
    }

    return new_counter;
}

function RWSE2_CTR(content, key, iv, crypt_type, update_prog = (prog) => { }) {
    var length = content.length, finished = 0, rounds = ((content.length - 1) >>> 5) + 1;
    var reg;
    let exkey = RWSE2_Key_Expand(key, RWSE2_OPER.OPER_ENCRYPT, crypt_type);

    let big_round = ((rounds - 1) >>> 9) + 1;
    let finished_big_round = 0;
    for (let i = 0; i < big_round; i++) {
        let this_round = (rounds - finished_big_round) > 512 ? 512 : (rounds - finished_big_round);

        for (let j = 0; j < this_round; j++) {
            let round_length = (length - finished) > 32 ? 32 : (length - finished);

            reg = RWSE2_Direct(iv, exkey);
            iv = counter_add(iv);
            for (let k = 0; k < round_length; k++) {
                content[(((i << 9) | j) << 5) | k] ^= reg[k];
            }

            finished += round_length;
        }

        update_prog(finished / length);
        finished_big_round += this_round;
    }
}