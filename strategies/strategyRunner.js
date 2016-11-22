/**
 * Created by patrickcremin on 11/21/16.
 */
"use strict";

var momentum = require('./momentum');

var dataLogger = require('../datalogger');
var trade = require('../trade');

class StrategyRunner
{
    constructor()
    {

    }

    run()
    {
        momentum.run();

        dataLogger.run();
        // trade.sell('market', null, 0.1, (c, o) =>{
        //     console.log(JSON.stringify(o))
        // })
    }

    stop()
    {
        momentum.stop();

        dataLogger.stop();
    }
}

module.exports = new StrategyRunner();