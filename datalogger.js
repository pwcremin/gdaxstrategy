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
        this.logCompletedOrderCallback = this.logCompletedOrder.bind( this )
    }

    run()
    {
        emitter.on(events.ORDER_COMPLETE, this.logCompletedOrderCallback)
    }

    stop()
    {
        emitter.removeListener(events.CANDLESTICK_UPDATE, this.logCompletedOrderCallback)
    }

    logCompletedOrder( order )
    {
        if(order.type === "market")
        {
            this.logMarketOrder( order )
        }
        else
        {
            this.logOrder( order )
        }
    }

    logMarketOrder( order )
    {
        var msg = "side: " + order.side + " type: " + order.type;

        if(order.funds != null)
        {
            msg += " funds: $" + order.funds;
        }

        if(order.size != null)
        {
            msg += " size: " + order.size;
        }

        if(order.price != null)
        {
            msg += " price: $" + order.price;
        }

        console.log( msg );
    }

    logOrder( order )
    {
        console.log( "side: " + order.side + " type: " + order.type + " size: " + order.size  + " price: $" + order.price );
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