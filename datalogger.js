"use strict";

var _ = require( 'lodash' );

var orderBook = require( './orderBook' );

var candlestickManager = require( './candleStick' );

// TODO need a file that just init all of these objects that will live for the duration
var orderTracker = require('./orderTracker');

var balance = require('./balance');

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;


class DataLogger {
    constructor()
    {
        emitter.on(events.CANDLESTICK_UPDATE, this.logCandlestickState.bind( this ))
        emitter.on(events.CANDLESTICK_COMPLETE, this.onTradingPeriodEnd.bind( this ))
    }

    onTradingPeriodEnd( candleStick )
    {

    }

    logCandlestickState()
    {
        var rollingCandleStick = candlestickManager.getRollingCandleStick();

        if ( !rollingCandleStick ) return;

        var candleSize = Number(Math.round(rollingCandleStick.getBodySize()+'e2')+'e-2').toFixed(2);

        var order = rollingCandleStick.trade;

        if(typeof order.side === 'undefined')
        {
            console.log('d')
        }

        console.log( "candle size: " + candleSize + "\t| side: '" + order.side + "' price: $" + order.price + " size: " + order.size );
    }
}

var dl = new DataLogger();

module.exports = dl;