/*global describe, before, after, beforeEach, afterEach, it */
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

var ComboBase = require('../lib/cluster/base');
var ComboMaster = require('../lib/cluster');

describe("cluster master", function () {
    var PIDS_DIR = 'test/fixtures/pids';

    after(cleanPidsDir);

    describe("instantiation", function () {
        it("should support empty options arg with correct defaults", function () {
            var instance = new ComboMaster();

            instance.should.have.property('options');
            instance.options.should.eql(ComboMaster.defaults);
        });

        it("should support factory-style (no new)", function () {
            /*jshint newcap: false */
            var instance = ComboMaster();

            instance.should.be.an.instanceOf(ComboMaster);
            instance.should.have.property('options');
        });

        it("should be an instance of ComboBase", function () {
            var instance = new ComboMaster();

            instance.should.be.an.instanceOf(ComboBase);
        });

        it("should call constructor callback if passed after config", function (done) {
            var instance = new ComboMaster({}, done);
        });

        it("should detect constructor callback if passed instead of config", function (done) {
            var instance = new ComboMaster(done);
        });
    });

    describe("on 'destroy'", function () {
        it("should detach events, passing through callback", function (done) {
            var instance = new ComboMaster();

            instance._bindProcess();
            hasAttachedSignalEvents();

            instance.destroy(function () {
                hasDetachedSignalEvents();

                done();
            });
        });

        it("should not error when detachEvents callback missing", function () {
            var instance = new ComboMaster();

            instance._bindProcess();
            hasAttachedSignalEvents();

            instance.destroy();
            hasDetachedSignalEvents();
        });
    });

    describe("on 'start'", function () {
        var master;

        before(cleanPidsDir);

        beforeEach(function (done) {
            master = new ComboMaster({
                pids: PIDS_DIR
            }, done);
        });

        afterEach(function (done) {
            master.destroy(done);
            master = null;
        });

        after(cleanPidsDir);

        it("should setupMaster with exec config", function (done) {
            master.setupMaster = function (options) {
                options.should.have.property('exec');
                options.exec.should.equal(path.resolve(__dirname, '../lib/cluster/worker.js'));
            };
            master.emit('start', done);
        });

        it("should create master.pid", function (done) {
            master.emit('start', function () {
                fs.readFile(path.join(master.options.pids, 'master.pid'), done);
            });
        });

        it("should attach signal events", function (done) {
            master.emit('start', function () {
                hasAttachedSignalEvents();
                done();
            });
        });
    });

    describe("on 'listen'", function () {
        after(cleanPidsDir);

        it("should fork workers", function (done) {
            var instance = new ComboMaster({ pids: PIDS_DIR });

            instance.on('listen', function () {
                instance.destroy(done);
            });

            instance.listen();
        });
    });

    describe("signal methods", function () {
        // afterEach(cleanPidsDir);
        // this causes a worker test to fail inexplicably

        it("#status() should log master state", function (done) {
            this.timeout(100);

            var instance = new ComboMaster({ pids: PIDS_DIR });

            instance.emit('start', function () {
                instance.status();
                setTimeout(done, 10);
            });
        });

        it("#restart() should send SIGUSR2", function (done) {
            var instance = new ComboMaster({ pids: PIDS_DIR });

            instance._signalMaster = function (signal) {
                signal.should.equal('SIGUSR2');
                done();
            };

            instance.emit('start', function () {
                instance.restart();
            });
        });

        it("#shutdown() should send SIGTERM", function (done) {
            var instance = new ComboMaster({ pids: PIDS_DIR });

            instance._signalMaster = function (signal) {
                signal.should.equal('SIGTERM');
                done();
            };

            instance.emit('start', function () {
                instance.shutdown();
            });
        });

        it("#stop() should send SIGKILL", function (done) {
            var instance = new ComboMaster({ pids: PIDS_DIR });

            instance._signalMaster = function (signal) {
                signal.should.equal('SIGKILL');
                done();
            };

            instance.emit('start', function () {
                instance.stop();
            });
        });
    });

    // Test Utilities ---------------------------------------------------------

    function hasAttachedSignalEvents() {
        process.listeners('SIGINT' ).should.have.length(1);
        process.listeners('SIGTERM').should.have.length(1);
        process.listeners('SIGUSR2').should.have.length(1);
    }

    function hasDetachedSignalEvents() {
        process.listeners('SIGINT' ).should.be.empty;
        process.listeners('SIGTERM').should.be.empty;
        process.listeners('SIGUSR2').should.be.empty;
    }

    function cleanPidsDir() {
        rimraf.sync(PIDS_DIR);
    }
});
