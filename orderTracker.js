// Tracks all orders


"use strict";
var orderBook = require( './orderBook' );

var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class OrderTracker {
    constructor()
    {
        this.orders = {};

        this.onMessageCallback = this.onMessage.bind( this );

        emitter.on( events.WSS_MESSAGE, this.onMessageCallback );
    }

    onMessage( order )
    {
        switch ( order.type )
        {
            case "open":

                this.addEntry( order );
                break;

            case "done":

                this.updateCandleSticks( order );

                break;

            case "change":

                this.updateEntry( order )

                break;

            case "match":

                this.addEntry( order );

                break;

            default:
                break;
        }
    }

    addEntry( order )
    {
        var newOrder = this.createOrder( order );
        this.orders[ newOrder.orderId ] = newOrder;
    }

    updateEntry( order )
    {
        this.orders[ order[ "order_id" ] ].size = parseFloat( order[ "new_size" ] );
    }

    getOrder( orderId )
    {
        return this.orders[ orderId ];
    }

    createOrder( order )
    {
        var orderId = order[ "type" ] === "match" ? order[ "taker_order_id" ] : order[ "order_id" ];

        var size = order[ "type" ] == "open" ? order[ "remaining_size" ] : order[ "size" ];

        return {
            price: parseFloat( order[ "price" ] ),
            size: parseFloat( size ),
            orderId: orderId,
            side: order[ "side" ]
        };
    }

    updateCandleSticks( order )
    {
        if ( order[ "reason" ] == "filled" )
        {
            var trackedOrder = this.getOrder( order[ "order_id" ] );

            // TODO need to do something with the remaining size.  Means there is some of the order left
            // and could affect volume tracking
            if ( trackedOrder == null )
            {
                // TODO I don't know why the order is missing.  I can't even find it in the order book.
                // no idea where this order came from
                console.log( "MISSING ORDER" );
                return;
            }

            var orderCopy = Object.assign( {}, trackedOrder );

            emitter.emit( events.ORDER_COMPLETE, orderCopy );
        }
    }
}


module.exports = new OrderTracker();
;