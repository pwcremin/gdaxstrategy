/**
 * Created by patrickcremin on 11/21/16.
 */

const EventEmitter = require('events');

const emitter = new EventEmitter();

const events = {
    ORDER_COMPLETE: "ORDER_COMPLETE",
    WSS_MESSAGE: "WSS_MESSAGE",
    CANDLESTICK_UPDATE: "CANDLESTICK_UPDATE",
    CANDLESTICK_COMPLETE: "CANDLESTICK_COMPLETE",
};

module.exports = {
    emitter: emitter,
    events: events
};