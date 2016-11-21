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
        this.logCandlestickStateCallback= this.logCandlestickState.bind( this )
        this.onTradingPeriodEndCallback = this.onTradingPeriodEnd.bind( this )
    }

    run()
    {
        emitter.on(events.CANDLESTICK_UPDATE, this.logCandlestickStateCallback)
        emitter.on(events.CANDLESTICK_COMPLETE, this.onTradingPeriodEndCallback)
    }

    stop()
    {
        emitter.removeListener(events.CANDLESTICK_UPDATE, this.logCandlestickStateCallback)
        emitter.removeListener(events.CANDLESTICK_COMPLETE, this.onTradingPeriodEndCallback)
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

module.exports = new DataLogger();