"use strict";

const _ = require("lodash");
const express = require("express");

const app = express();
app.use(express.static('public'));

const SerialPort = require("serialport");

let port;

function connectUSB(devicePath) {
    port = new SerialPort(devicePath, { baudRate: 9600 });
}

connectUSB("/dev/ttyUSB0");

var historyData = {
    temperature: [],
    pressure: [],
    altitude: [],
    humidity: []
};

var sensorData = {
    temperature: 0,
    pressure: 0,
    altitude: 0,
    humidity: 0
};

const template = _.template(`
    <div class="value-container temp">
        <div class="label"> 
            Temperature:
        </div>
        <div class="value">
            <%= temperature %>
        </div>
        <div class="history">
            <% _.forEach(history["temperature"], function(value) { %>
                <div><%= value %></div>
            <% }); %>
        </div>
    </div>  
    `);

/*
<div class="value-container press">
        <div class="label"> 
            Pressure:
        </div>
        <div class="value">
            <%= pressure %>
        </div>
        <div class="history">
            <%= history["pressure"].join("  |  ") %>
        </div>
    </div>
    <div class="value-container alt">
        <div class="label"> 
            Altitude:
        </div>
        <div class="value">
            <%= altitude %>
        </div>
        <div class="history">
            <%= history["altitude"].join("  |  ") %>
        </div>
    </div>
    <div class="value-container hum">
        <div class="label"> 
            Humidity:
        </div>
        <div class="value">
            <%= humidity %>
        </div>
        <div class="history">
            <%= history["humidity"].join("  |  ") %>
        </div>
    </div>
*/

/*
historyData = _.mapValues(historyData, (val, key) => {
    return _.range(100).map( x => {
        let now = new Date().toString();
        let item = { time: now };
        item[key] = Math.random() * 20;
        return item;
    });
});
*/

app.get('/api/data', function (req, res) {
    let tempHistory = historyData.temperature.slice().reverse();
    let sensorHistory = _.mapValues(historyData, ar => {
        return ar.slice().reverse();
    });
    res.send(Object.assign(sensorData, { history: sensorHistory }));
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

port.on("open", () => {
    console.log("Sensor port open");
    let message = "";
    let onGoingMessage = false;
    port.on("data", data => {
        const newData = data.toString("ascii");
        console.log()
        if (!onGoingMessage) {
            if (newData.indexOf("{") !== -1) {
                onGoingMessage = true;
                message = newData;
            }
        }
        else {
            if (newData.indexOf("}") !== -1) {
                onGoingMessage = false;
                message += newData;
                let parsedMessage = JSON.parse(message);
                let now = new Date().toString();
                historyData.temperature.push({ time: now, temperature: parsedMessage.temperature });
                historyData.pressure.push({ time: now, pressure: parsedMessage.pressure });
                historyData.altitude.push({ time: now, altitude: parsedMessage.altitude });
                historyData.humidity.push({ time: now, humidity: parsedMessage.humidity });
                Object.keys(historyData).forEach(key => {
                    if (historyData[key].length > 120) {
                        historyData[key].shift();
                    }
                })
                console.log("Sensordata", JSON.stringify(parsedMessage, null, 2));
                sensorData = parsedMessage;
                message = "";
            }
            else {
                message += newData;
            }
        }       
        //console.log("data", data.toString("ascii"));
    });

})
