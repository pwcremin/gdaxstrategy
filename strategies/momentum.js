// When there is an increase in buys/sells track them until they slow down, and then do the opposite
// The idea is that other bots/people know what they are doing (or are even manipulating the market)
// So if they suddenly drive down the price, thats a good time to buy, and if they drive it up then sell.
//
// This isnt that different from dailyPivot, but it isnt looking at candlesticks.  Its tracking the momentum
// of trades and assuming the people doing those trades are analyzing the market for me.

"use strict";

var emitter = require( '../emitter' ).emitter;
var events = require( '../emitter' ).events;

var _ = require( 'lodash' );

class MomentumStrategy {
    constructor()
    {
        var timeInterval = 5 * 60 * 1000;
        var weight = 15;

        this.movingAverages = {
            buy: new MovingAverage( timeInterval, weight ),
            sell: new MovingAverage( timeInterval, weight )
        };

        this.onOrderCompleteCallback = this.onOrderComplete.bind( this );
    }

    run()
    {
        emitter.on( events.ORDER_COMPLETE, this.onOrderCompleteCallback );

        this.movingAverages.buy.start();
        this.movingAverages.sell.start();
    }

    stop()
    {
        emitter.removeListener( events.ORDER_COMPLETE, this.onOrderCompleteCallback );

        this.movingAverages.buy.stop();
        this.movingAverages.sell.stop();
    }

    onOrderComplete( order )
    {
        this.movingAverages[ order.side ].push( order.size );

        this.log()
    }

    log()
    {
        var buyMA = this.movingAverages.buy.getAverage();
        var sellMA = this.movingAverages.sell.getAverage();

        var buyWeightedMA = this.movingAverages.buy.getWightedAverage();
        var sellWeightedMA = this.movingAverages.sell.getWightedAverage();

        console.log( "--- buy MA: " + buyMA + " WMA:" + buyWeightedMA );
        console.log( "--- sell MA: " + sellMA + " WMA:" + sellWeightedMA );
    }
}

class MovingAverage {
    constructor( sizeInMS, weight )
    {
        this.sizeInMS = sizeInMS;
        this.weight = weight;
        this.window = [];
    }

    start()
    {
        this.timerId = setInterval( this.update.bind( this ), 500 );
    }

    stop()
    {
        clearInterval( this.timerId );
    }

    push( value )
    {
        this.window.push( { time: Date.now(), value: value } )
    }

    getAverage()
    {
        if ( this.window.length == 0 ) return 0;

        var avg = _.sumBy( this.window, 'value' ) / this.window.length;

        return Number( Math.round( avg + 'e2' ) + 'e-2' ).toFixed( 2 );
    }

    getWightedAverage()
    {
        if(this.window.length == 0) return 0;

        var lengthArray = _.range(1, this.window.length);
        var triangularD = lengthArray.reduce((v, c, i) =>
        {
            return v + i
        }, 1);

        var avg = this.window.reduce( ( avg, data, index ) =>
        {
            var i = index + 1;
            var r = avg + (data.value * (i / triangularD));
            return r
        }, 0 )

        return Number( Math.round( avg + 'e2' ) + 'e-2' ).toFixed( 2 );
    }

    update()
    {
        var startTime = Date.now() - this.sizeInMS;

        for ( var i = 0; i < this.window.length; i++ )
        {
            if ( this.window[ i ].time < startTime )
            {
                delete this.window[ i ];
            }
        }
    }
}

module.exports = new MomentumStrategy();