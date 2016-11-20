/**
 * Created by patrickcremin on 11/19/16.
 */
"use strict";

var _ = require( 'lodash' );

class CandleStickManager {
    constructor( )
    {
        var timeDeltaSeconds = 60 * 2;
        this.maxLength = 10000; // TODO made up number

        this.candleSticks = [];

        this.trades = [];

        this.timerId = setInterval( this.complete.bind( this ), timeDeltaSeconds * 1000 );

        this.candlestickCallback = _.noop;
    }

    onCandlestick( cb )
    {
        this.candlestickCallback = cb;
    }

    add(trade)
    {
        this.trades.push(trade);
    }

    getRollingCandleStick()
    {
        if(this.trades.length === 0)
        {
            console.log('what')
        }
        // TODO need something better than this
        // should be impossible for this to happen
        //if(this.trades.length == 0) null;

        var open = _.first( this.trades ).price;
        var close = _.last( this.trades ).price;

        return {
            open: open,
            close: close,
            getBodySize: () => Math.abs(open - close),
            isHollow: () => close > open
        }
    }

    complete()
    {
        var candleStick = new CandleStick(this.trades);
        this.trades = [];

        this.candleSticks.push(candleStick);  // TODO monitor length, can get too big and crash

        this.candlestickCallback(candleStick);

        if(this.candleSticks.length > this.maxLength)
        {
            this.candleSticks = this.candleSticks.slice(1000); // TODO another made up number, but just chop off some sticks
        }

        //this.log();
    }


    log()
    {
        console.log("-----------------------");
        this.candleSticks.forEach( function ( candleStick )
        {
            console.log( candleStick.toString() );
        } )
        console.log("-----------------------");

    }
}

class CandleStick {
    constructor( trades )
    {
        // will crap on itself if no trades...
        // but need to somehow indicate that no trades happened in the time period
        if(trades.length === 0) return;

        this.numTrades = trades.length;

        this.open = _.first( trades ).price;
        this.close = _.last( trades ).price;

        this.high = _.maxBy( trades, 'price' ).price;
        this.low = _.minBy( trades, 'price' ).price;

        this.time = Date.now();

        this.volume = trades.reduce( (volume, trade ) => {
            return (trade.size + volume)}, 0);

        if(this.volume == null)
        {
            console.log('what?')
        }

        this.body = this.close < this.open; // true (filled) when close is less than open

    }

    isHollow() // stock closed higher than it opened
    {
        return this.close > this.open;
    }

    isClosed()
    {
        return this.open >= this.close
    }

    getBodySize()
    {
        return Math.abs(this.open - this.close)
    }

    toString()
    {
        return JSON.stringify( this );
    }
}


module.exports = new CandleStickManager();
