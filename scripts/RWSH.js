"use-strict";

export { RWSH, RWSH_TYPE };

const RWSH_TYPE = {
    RWSH256: 0,
    RWSH384: 1,
    RWSH512: 2,
    RWXH256: 4,
    RWXH512: 6
};

/**
 * K-box (kappa box) is one cyclic centrosymmetric solution of Knight's Tour problem.
 */
const K_box = new Uint8Array([
    0o12, 0o13, 0o21, 0o24, 0o16, 0o17, 0o27, 0o26,
    0o02, 0o03, 0o04, 0o25, 0o06, 0o07, 0o37, 0o36,
    0o01, 0o00, 0o34, 0o15, 0o05, 0o44, 0o47, 0o35,
    0o11, 0o10, 0o20, 0o14, 0o46, 0o23, 0o55, 0o45,
    0o32, 0o22, 0o54, 0o31, 0o63, 0o57, 0o67, 0o66,
    0o42, 0o30, 0o33, 0o72, 0o62, 0o43, 0o77, 0o76,
    0o41, 0o40, 0o70, 0o71, 0o52, 0o73, 0o74, 0o75,
    0o51, 0o50, 0o60, 0o61, 0o53, 0o56, 0o64, 0o65
]);

/**
 * The substitution box (a.k.a. S-box) of the encryption scheme.
 * 
 * It is constructed by the following formula:
 * 
 * SB[i] = (A * (0xa4 pow i)) xor 0xe3.
 * 
 * pow represents power operation on Galois Field GF(2^8) with
 * the primitive polynomial be 0435 (0b100011101).
 * 
 * A is a circulant matrix generated from value 0xd3(1 1 0 1 0 0 1 1)
 * which is the product of 'R' and 'W' under the field above.
 * 
 * 0xa4 represents the sum of hex value of string "RichadoWonosas",
 * which is exactly 0x5a4.
 */
const S_box = new Uint8Array([
    0x28, 0x50, 0xa7, 0x91, 0x08, 0x8f, 0x2c, 0x61, 0xd6, 0xa3, 0xa0, 0x79, 0xbd, 0x84, 0x97, 0x47,
    0x46, 0xe1, 0x9d, 0x5b, 0x1c, 0xb7, 0x98, 0xcd, 0x11, 0x43, 0x77, 0x90, 0xaf, 0xf3, 0xea, 0x26,
    0x7d, 0x8c, 0xf5, 0xa5, 0xef, 0xb0, 0x70, 0x78, 0x1a, 0xf8, 0x51, 0x00, 0xed, 0xce, 0xc8, 0x87,
    0x4e, 0x83, 0x7f, 0xf2, 0x4d, 0x5a, 0xbb, 0xcb, 0x5e, 0x8a, 0xba, 0x6c, 0x22, 0x4c, 0xfd, 0xc7,
    0x0d, 0x19, 0x21, 0x95, 0x39, 0xfe, 0x1e, 0xc9, 0x20, 0x32, 0x45, 0x38, 0x59, 0x62, 0x0f, 0x67,
    0x99, 0x6a, 0x6d, 0x85, 0x30, 0x3b, 0x80, 0xa6, 0x36, 0x74, 0x49, 0x6b, 0xca, 0xf9, 0xf6, 0x7c,
    0x2b, 0x89, 0x63, 0xa8, 0x1b, 0x5f, 0x2d, 0xc6, 0xaa, 0x65, 0xe7, 0xd2, 0x92, 0xd1, 0x4b, 0x15,
    0x72, 0x06, 0xa2, 0x07, 0x05, 0x7b, 0xc3, 0x3c, 0x68, 0x13, 0x3d, 0xcf, 0x6f, 0xfb, 0x88, 0xc4,
    0xd4, 0xdd, 0x18, 0x86, 0xe9, 0xff, 0xb9, 0xb5, 0xe6, 0x75, 0xee, 0x17, 0x0c, 0xbe, 0x5d, 0x53,
    0x7e, 0x55, 0x31, 0x9c, 0xfc, 0x60, 0x71, 0xdf, 0x66, 0x3e, 0x16, 0xab, 0xc2, 0x9b, 0x14, 0xd5,
    0x7a, 0x64, 0x40, 0xae, 0x54, 0x96, 0xe0, 0x3a, 0x27, 0xda, 0xf0, 0x33, 0xe2, 0x44, 0x9f, 0x25,
    0xa4, 0x48, 0xcc, 0xb6, 0x3f, 0xb1, 0xd7, 0x04, 0xdc, 0xbf, 0xfa, 0x2f, 0xb8, 0x12, 0x9a, 0xb3,
    0xa9, 0xbc, 0x23, 0xeb, 0x81, 0x01, 0x4a, 0xb2, 0x0e, 0xc0, 0xe5, 0xac, 0x2a, 0x2e, 0x1f, 0x6e,
    0x5c, 0xf4, 0x02, 0x93, 0x76, 0x37, 0xd3, 0x35, 0xad, 0x8d, 0x52, 0xd9, 0x29, 0xf7, 0xdb, 0x57,
    0x4f, 0x24, 0x03, 0x34, 0x0a, 0xf1, 0x94, 0x9e, 0x82, 0xd8, 0x8e, 0x8b, 0x1d, 0x10, 0xe4, 0x0b,
    0x56, 0xe8, 0x58, 0xc5, 0x73, 0xa1, 0xde, 0xc1, 0x42, 0xd0, 0xec, 0x69, 0xb4, 0x41, 0x09, 0xe3
]);

/**
 * Round constants are 32-bit division of SHAKE256("RWSH", 2048).
 */
const rc = new Uint32Array([
    0x442965d4, 0xb517862c, 0xc57c536a, 0xf7a0cfd3, 0x26edbc94, 0xee1b4346, 0x1ea7feac, 0xe3315b50,
    0x738581f6, 0x15e187dc, 0x86fd7a28, 0x95d14028, 0xe1723c9c, 0x1cf8da6b, 0xb33a26f6, 0x3caba2c7,
    0x9fb269a0, 0xca203937, 0xf5c8bdc4, 0x3a9146fd, 0x3b8079be, 0xba2d5f10, 0xc575fd79, 0x02d7538b,
    0xa25417ca, 0x7a084c35, 0x15857de3, 0x1793c853, 0x3b0ddace, 0x76da2a4e, 0x4001e67f, 0xb7ed9c2a,
    0x9c940815, 0x1ce0bcc8, 0xa01e2803, 0x4c5e7f0d, 0x05d70dc7, 0xcb9e4490, 0x4500e474, 0x327096a4,
    0xa4b98b27, 0xa504afb9, 0xf072558e, 0xb7a04ef7, 0x75a01bdd, 0x06cc4464, 0x23d40e78, 0x30666a91,
    0x8c43e23d, 0x8e2b62b7, 0xb5199955, 0xbea8ed4d, 0x176e3046, 0xceed539b, 0xc410556c, 0xdc6a71b0,
    0x2675006e, 0xaa158525, 0x0c97a37e, 0xe1279f6c, 0xfc2c5760, 0x629250e5, 0xeb9226d7, 0xb939e095
]);

/**
 * Upper mask for SHUFFLE operation.
 */
const SHUF_UPPER_MASK = 0x92929292;

/**
 * Lower mask for SHUFFLE operation.
 */
const SHUF_LOWER_MASK = 0x6d6d6d6d;

/**
 * Circular left shift operation for qwords.
 */
const cshl = (qword, digit) => (((qword) << (digit)) | ((qword) >>> (32 - (digit))));

/**
 * Circular right shift operation for qwords.
 */
const cshr = (qword, digit) => (((qword) >>> (digit)) | ((qword) << (32 - (digit))));

/**
 * Single shuffle operation using masks and circular shifts.
 */
const shuf = (qword, digit, type) =>
    cshr(
        (
            cshl(
                ((qword) & (SHUF_UPPER_MASK)),
                (((type) & 3) << 3)) |
            ((qword) & (SHUF_LOWER_MASK))),
        (digit));

/**
 * Substitute 32-bit word.
 */
const SubWord = (word) => (
    (S_box[(word >>> 24) & 0xff] << 24) ^
    (S_box[(word >>> 16) & 0xff] << 16) ^
    (S_box[(word >>> 8) & 0xff] << 8) ^
    (S_box[word & 0xff]));

// Function definition & implementation

function sigma(state) {
    for (let i = 0; i < 64; i++) {
        state[i] = shuf(state[i], (5 * i + 1) & 31, (i + 1) % 3 + 1);
        state[i] = SubWord(state[i]);
    }
    return state;
}

function kappa(state) {
    let temp = state[0];
    state[0] = state[10];
    for (let i = 10; i != 0; i = K_box[i]) {
        state[i] = state[K_box[i]];
    }
    state[17] = temp;
    return state;
}

function mu(state) {
    let temp = new Uint32Array(state);
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            state[(i << 3) | j] ^=
                (cshl(temp[(i << 3) | ((j + 1) & 7)], 1) & cshr(temp[(((i + 1) & 7) << 3) | j], 1)) ^
                (cshl(temp[(i << 3) | ((j + 7) & 7)], 1) & cshr(temp[(((i + 7) & 7) << 3) | j], 1));
        }
    }
    return state;
}

function rho(state, round) {
    state[0] ^= rc[(round << 3)];
    state[9] ^= rc[(round << 3) | 1];
    state[18] ^= rc[(round << 3) | 2];
    state[27] ^= rc[(round << 3) | 3];
    state[36] ^= rc[(round << 3) | 4];
    state[45] ^= rc[(round << 3) | 5];
    state[54] ^= rc[(round << 3) | 6];
    state[63] ^= rc[(round << 3) | 7];
    return state;
}

function single_round(state, round) {
    return rho(mu(kappa(sigma(state))), round);
}

function RWSH_Single(state) {
    for (let i = 0; i < 7; i++) {
        state = single_round(state, i);
    }

    return state;
}

class RWSH {
    #type = true;
    #stat = false;
    #sec_param = 0;
    #output_length = 0;
    #pos = 0;
    #raw_state = new ArrayBuffer(256);
    #state2 = new Uint8Array(this.#raw_state);
    #state32 = new Uint32Array(this.#raw_state);

    constructor(type) {
        switch (type) {
            default:
            case RWSH_TYPE.RWSH256:
                this.#sec_param = 192;
                this.#output_length = 256;
                break;
            case RWSH_TYPE.RWSH384:
                this.#sec_param = 160;
                this.#output_length = 384;
                break;
            case RWSH_TYPE.RWSH512:
                this.#sec_param = 128;
                this.#output_length = 512;
                break;
            case RWSH_TYPE.RWXH256:
                this.#type = false;
                this.#sec_param = 192;
                this.#output_length = 256;
                break;
            case RWSH_TYPE.RWXH512:
                this.#type = false;
                this.#sec_param = 128;
                this.#output_length = 512;
                break;
        }
    }

    absorb(data) {
        if (!(data instanceof Uint8Array))
            return this;

        for (let i = 0; i < data.byteLength; i++) {
            this.#state2[this.#pos] ^= data[i];

            this.#pos++;
            if (this.#pos == this.#sec_param) {
                this.#state32 = RWSH_Single(this.#state32);
                this.#pos -= this.#sec_param;
            }
        }

        return this;
    }

    digest(output_length = this.#output_length) {
        if (this.#stat) {
            return undefined;
        }
        if (this.#type) {
            output_length = this.#output_length;
        }

        let byte_length = output_length >>> 3;
        let result = new Uint8Array(byte_length);

        this.#state2[this.#pos] ^= (this.#type) ? 0b10100000 : 0b11100000;
        this.#state2[this.#sec_param - 1] ^= 1;

        this.#pos = 0;
        this.#state32 = RWSH_Single(this.#state32);

        for (let i = 0; i < byte_length; i++) {
            result[i] = this.#state2[this.#pos];
            this.#pos++;
            if (this.#pos == this.#sec_param) {
                this.#state32 = RWSH_Single(this.#state32);
                this.#pos -= this.#sec_param;
            }
        }

        this.#stat = true;

        return result;
    }
}
