"use strict"

var _ = require( 'lodash' );
var gdaxApi = require( './gdaxApi' );
var emitter = require( './emitter' ).emitter;
var events = require( './emitter' ).events;

class OrderBook {
    constructor()
    {
        // lv 3 book
        this.book = {
            sequence: "",
            bids: [], //[ price, size, order_id ],
            asks: [], //[ price, size, order_id ],
        };

        this.queue = [];

        this.orderListener = this.addToQueue.bind( this )

        emitter.on( events.WSS_MESSAGE, this.orderListener );

        this.createOrderBook();
    }

    addToQueue( order )
    {
        this.queue.push( order )
    }

    createOrderBook()
    {
        gdaxApi.orderBook( "3", orderbook =>
        {
            this.book = orderbook;

            emitter.on( events.WSS_MESSAGE, this.onMessage.bind( this ) )
            emitter.removeListener( events.WSS_MESSAGE, this.orderListener );

            this.queue.forEach( order =>
            {
                if ( order[ "sequence" ] > orderbook[ "sequence" ] )
                {
                    this.onMessage( order )
                }
            } )
        } )
    }

    onMessage( order )
    {
        this.book.sequence = order[ "sequence" ];

        switch ( order.type )
        {
            case "open":

                this.addEntry( order );

                break;

            case "done":

                this.deleteEntry( order );

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
        var orderId = order[ "type" ] === "match" ? order[ "taker_order_id" ] : order[ "order_id" ];

        var bookType = order.side == "buy" ? "bids" : 'asks';

        var size = order[ "type" ] == "open" ? order[ "remaining_size" ] : order[ "size" ];

        // price, size, id
        this.book[ bookType ].push([ order.price, size, orderId ])
    }

    deleteEntry( order )
    {
        // TODO can a match ever be deleted?  I think a match will result in a 'done' after
        //var orderId = order[ "type" ] === "match" ? order[ "taker_order_id" ] : order[ "order_id" ];

        var orderId = order[ "order_id" ];
        var bookType = order.side == "buy" ? "bids" : 'asks';

        for ( var i = 0; i < this.book[ bookType ].length; i++ )
        {
            if ( orderId === this.book[ bookType ][ i ][ 2 ] )
            {
                this.book[ bookType ].slice( i, 1 );
                break;
            }
        }
    }

    updateEntry( order )
    {
        var orderId = order[ "order_id" ];
        var bookType = order.side === "buy" ? "bids" : 'asks';

        for ( var i = 0; i < this.book[ bookType ].length; i++ )
        {
            if ( orderId === this.book[ bookType ][ i ][ 2 ] )
            {
                this.book[ bookType ][ i ] = [
                    this.book[ bookType ][ i ][ 0 ],
                    parseFloat( order[ "new_size" ] ),
                    this.book[ bookType ][ i ][ 2 ]
                ];

                break;
            }
        }
    }

    findOrderById( orderId )
    {
        [ "bids", "asks" ].forEach( bookType =>
        {
            for ( var i = 0; i < this.book[ bookType ].length; i++ )
            {
                if ( orderId === this.book[ bookType ][ i ][ 2 ] )
                {
                    return this.book[ bookType ][ i ];
                }
            }
        } );
    }
}

module.exports = new OrderBook();
