// When there is an increase in buys/sells track them until they slow down, and then do the opposite
// The idea is that other bots/people know what they are doing (or are even manipulating the market)
// So if they suddenly drive down the price, thats a good time to buy, and if they drive it up then sell.
//
// This isnt that different from dailyPivot, but it isnt looking at candlesticks.  Its tracking the momentum
// of trades and assuming the people doing those trades are analyzing the market for me.

"use strict";

var { emitter, events } = require( './emitter' );

var _ = require('lodash');
var MA = require( 'moving-average' );

class MomentumStrategy {
    constructor()
    {

        var timeInterval = 5 * 60 * 1000;

        this.movingAverages = {
            buy: MA( timeInterval ),
            sell: MA( timeInterval )
        };

        this.velocities = {  // buys/sells per timeInterval
            buy: 0,
            sell: 0
        };


        emitter.on( events.ORDER_COMPLETE, this.onOrderComplete.bind( this ) );

    }

    run()
    {

    }

    onOrderComplete( order )
    {
        this.movingAverages[ order.side ].push( Date.now(), order.size );

    }

    calculateMovingAverage()
    {

    }
}

class MovingWindow {
    constructor( sizeInSeconds )
    {
        this.size = sizeInSeconds;

        this.window = []

        this.timerId = setInterval(this.update.bind(this), 500);
    }

    push( value )
    {
        this.window.push( { time: Date.now, value: value } )
    }

    getAverage()
    {
        return _.sumBy(this.window, 'value').value / this.window.length;
    }

    update()
    {
        var startTime = Date.now() - (this.size * 1000);

        for ( var i = 0; i < this.window.length; i++ )
        {

            if(this.window[ i ].time < startTime)
            {
                delete this.window[ i ];
            }
        }
    }
}
