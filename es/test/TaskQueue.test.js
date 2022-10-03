import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { TaskQueue, REASON_CANCELLED } from "../simularium/TaskQueue";

var delay = function delay(t) {
  var resultPromise = new Promise(function (resolve) {
    setTimeout(function () {
      return resolve(t);
    }, t);
  });
  return resultPromise;
};

describe("TaskQueue module", function () {
  // note that tests all add more than 4 tasks to exceed the max concurrency of the queue
  test("it resolves tasks that finish synchronously", function () {
    var add = function add(x, y) {
      var resultPromise = new Promise(function (resolve) {
        resolve(x + y);
      });
      return resultPromise;
    };

    var q = new TaskQueue();
    var p0 = q.enqueue(function () {
      return add(1, 2);
    });
    var p1 = q.enqueue(function () {
      return add(2, 4);
    });
    var p2 = q.enqueue(function () {
      return add(4, 5);
    });
    var p3 = q.enqueue(function () {
      return add(4, 6);
    });
    var p4 = q.enqueue(function () {
      return add(4, 7);
    });
    var p5 = q.enqueue(function () {
      return add(4, 8);
    });
    var expected = [3, 6, 9, 10, 11, 12];
    Promise.all([p0, p1, p2, p3, p4, p5]).then(function (retData) {
      expect(retData).toEqual(expected);
    });
  });
  test("it resolves all delayed tasks", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
    var addDelayed, q, p0, p1, p2, p3, p4, p5, expected;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            addDelayed = function addDelayed(x, y, t) {
              var resultPromise = new Promise(function (resolve) {
                setTimeout(function () {
                  return resolve(x + y);
                }, t);
              });
              return resultPromise;
            };

            q = new TaskQueue();
            _context.next = 4;
            return q.enqueue(function () {
              return addDelayed(1, 2, 500);
            });

          case 4:
            p0 = _context.sent;
            _context.next = 7;
            return q.enqueue(function () {
              return addDelayed(2, 4, 500);
            });

          case 7:
            p1 = _context.sent;
            _context.next = 10;
            return q.enqueue(function () {
              return addDelayed(4, 5, 500);
            });

          case 10:
            p2 = _context.sent;
            _context.next = 13;
            return q.enqueue(function () {
              return addDelayed(4, 6, 500);
            });

          case 13:
            p3 = _context.sent;
            _context.next = 16;
            return q.enqueue(function () {
              return addDelayed(4, 7, 500);
            });

          case 16:
            p4 = _context.sent;
            _context.next = 19;
            return q.enqueue(function () {
              return addDelayed(4, 8, 500);
            });

          case 19:
            p5 = _context.sent;
            expected = [3, 6, 9, 10, 11, 12];
            expect([p0, p1, p2, p3, p4, p5]).toEqual(expected);

          case 22:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  })));
  test("it handles the case when some tasks reject", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
    var addButRejectOdd, q, p0, p1, p2, p3, p4, p5;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            addButRejectOdd = function addButRejectOdd(x, y) {
              var resultPromise = new Promise(function (resolve, reject) {
                if ((x + y) % 2) {
                  reject("Odd sums are rejected");
                }

                resolve(x + y);
              });
              return resultPromise;
            };

            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return addButRejectOdd(1, 2);
            });
            p1 = q.enqueue(function () {
              return addButRejectOdd(2, 4);
            });
            p2 = q.enqueue(function () {
              return addButRejectOdd(4, 5);
            });
            p3 = q.enqueue(function () {
              return addButRejectOdd(4, 6);
            });
            p4 = q.enqueue(function () {
              return addButRejectOdd(4, 7);
            });
            p5 = q.enqueue(function () {
              return addButRejectOdd(4, 8);
            });
            _context2.next = 10;
            return expect(p0).rejects.toEqual("Odd sums are rejected");

          case 10:
            _context2.next = 12;
            return expect(p1).resolves.toEqual(6);

          case 12:
            _context2.next = 14;
            return expect(p2).rejects.toEqual("Odd sums are rejected");

          case 14:
            _context2.next = 16;
            return expect(p3).resolves.toEqual(10);

          case 16:
            _context2.next = 18;
            return expect(p4).rejects.toEqual("Odd sums are rejected");

          case 18:
            _context2.next = 20;
            return expect(p5).resolves.toEqual(12);

          case 20:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  })));
  test("it handles the case when some delayed tasks reject", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
    var addButRejectOddDelayed, q, p0, p1, p2, p3, p4, p5;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            addButRejectOddDelayed = function addButRejectOddDelayed(x, y, t) {
              var resultPromise = new Promise(function (resolve, reject) {
                setTimeout(function () {
                  if ((x + y) % 2) {
                    reject("Odd sums are rejected");
                  }

                  resolve(x + y);
                }, t);
              });
              return resultPromise;
            };

            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return addButRejectOddDelayed(1, 2, 500);
            });
            p1 = q.enqueue(function () {
              return addButRejectOddDelayed(2, 4, 500);
            });
            p2 = q.enqueue(function () {
              return addButRejectOddDelayed(4, 5, 500);
            });
            p3 = q.enqueue(function () {
              return addButRejectOddDelayed(4, 6, 500);
            });
            p4 = q.enqueue(function () {
              return addButRejectOddDelayed(4, 7, 500);
            });
            p5 = q.enqueue(function () {
              return addButRejectOddDelayed(4, 8, 500);
            });
            _context3.next = 10;
            return expect(p0).rejects.toEqual("Odd sums are rejected");

          case 10:
            _context3.next = 12;
            return expect(p1).resolves.toEqual(6);

          case 12:
            _context3.next = 14;
            return expect(p2).rejects.toEqual("Odd sums are rejected");

          case 14:
            _context3.next = 16;
            return expect(p3).resolves.toEqual(10);

          case 16:
            _context3.next = 18;
            return expect(p4).rejects.toEqual("Odd sums are rejected");

          case 18:
            _context3.next = 20;
            return expect(p5).resolves.toEqual(12);

          case 20:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  })));
  test("it handles the case when some tasks throw", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
    var addButThrowOdd, q, p0, p1, p2, p3, p4, p5;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            addButThrowOdd = function addButThrowOdd(x, y) {
              var resultPromise = new Promise(function (resolve) {
                if ((x + y) % 2) {
                  throw "Odd sums are thrown";
                }

                resolve(x + y);
              });
              return resultPromise;
            };

            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return addButThrowOdd(1, 2);
            });
            p1 = q.enqueue(function () {
              return addButThrowOdd(2, 4);
            });
            p2 = q.enqueue(function () {
              return addButThrowOdd(4, 5);
            });
            p3 = q.enqueue(function () {
              return addButThrowOdd(4, 6);
            });
            p4 = q.enqueue(function () {
              return addButThrowOdd(4, 7);
            });
            p5 = q.enqueue(function () {
              return addButThrowOdd(4, 8);
            });
            _context4.next = 10;
            return expect(p0).rejects.toEqual("Odd sums are thrown");

          case 10:
            _context4.next = 12;
            return expect(p1).resolves.toEqual(6);

          case 12:
            _context4.next = 14;
            return expect(p2).rejects.toEqual("Odd sums are thrown");

          case 14:
            _context4.next = 16;
            return expect(p3).resolves.toEqual(10);

          case 16:
            _context4.next = 18;
            return expect(p4).rejects.toEqual("Odd sums are thrown");

          case 18:
            _context4.next = 20;
            return expect(p5).resolves.toEqual(12);

          case 20:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  })));
  test("it can run tasks that resolve over time", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
    var q, p0, p1, p2, p3, p4, p5;
    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return delay(1000);
            });
            p1 = q.enqueue(function () {
              return delay(1001);
            });
            p2 = q.enqueue(function () {
              return delay(1002);
            });
            p3 = q.enqueue(function () {
              return delay(1003);
            });
            p4 = q.enqueue(function () {
              return delay(1004);
            });
            p5 = q.enqueue(function () {
              return delay(1005);
            });
            expect(q.getNumActive()).toBe(4);
            expect(q.getLength()).toBe(2);
            _context5.next = 11;
            return expect(p0).resolves.toBe(1000);

          case 11:
            _context5.next = 13;
            return expect(p1).resolves.toBe(1001);

          case 13:
            _context5.next = 15;
            return expect(p2).resolves.toBe(1002);

          case 15:
            _context5.next = 17;
            return expect(p3).resolves.toBe(1003);

          case 17:
            _context5.next = 19;
            return expect(p4).resolves.toBe(1004);

          case 19:
            _context5.next = 21;
            return expect(p5).resolves.toBe(1005);

          case 21:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  })));
  test("it can cancel tasks not already started", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
    var q, p0, p1, p2, p3, p4, p5;
    return _regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return delay(1000);
            });
            p1 = q.enqueue(function () {
              return delay(1001);
            });
            p2 = q.enqueue(function () {
              return delay(1002);
            });
            p3 = q.enqueue(function () {
              return delay(1003);
            });
            p4 = q.enqueue(function () {
              return delay(1004);
            });
            p5 = q.enqueue(function () {
              return delay(1005);
            });
            expect(q.getNumActive()).toBe(4);
            expect(q.getLength()).toBe(2);
            q.stopAll();
            expect(q.getLength()).toBe(0);
            p0.then(function (value) {
              expect(value).toBe(1000);
            });
            p1.then(function (value) {
              expect(value).toBe(1001);
            });
            p2.then(function (value) {
              expect(value).toBe(1002);
            });
            p3.then(function (value) {
              expect(value).toBe(1003);
            });
            p4.then(null, function (error) {
              expect(error).toBe(REASON_CANCELLED);
            });
            p5.then(null, function (error) {
              expect(error).toBe(REASON_CANCELLED);
            });

          case 17:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  })));
  test("it can queue new tasks after cancelling", /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
    var q, p0, p1, p2, p3, p4, p5, p6;
    return _regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            // enqueue 6 items
            // cancel queue
            // then enqueue another.
            // We expect the first 4 times to complete, the next two rejected, and the last to complete.
            q = new TaskQueue();
            p0 = q.enqueue(function () {
              return delay(1000);
            });
            p1 = q.enqueue(function () {
              return delay(1001);
            });
            p2 = q.enqueue(function () {
              return delay(1002);
            });
            p3 = q.enqueue(function () {
              return delay(1003);
            });
            p4 = q.enqueue(function () {
              return delay(1004);
            });
            p5 = q.enqueue(function () {
              return delay(1005);
            });
            q.stopAll();
            expect(q.getLength()).toBe(0);
            expect(q.getNumActive()).toBe(4);
            p6 = q.enqueue(function () {
              return delay(1006);
            });
            expect(q.getLength()).toBe(1);
            p0.then(function (value) {
              expect(value).toBe(1000);
            });
            p1.then(function (value) {
              expect(value).toBe(1001);
            });
            p2.then(function (value) {
              expect(value).toBe(1002);
            });
            p3.then(function (value) {
              expect(value).toBe(1003);
            });
            p4.then(null, function (error) {
              expect(error).toBe(REASON_CANCELLED);
            });
            p5.then(null, function (error) {
              expect(error).toBe(REASON_CANCELLED);
            });
            p6.then(function (value) {
              expect(value).toBe(1006);
            });

          case 19:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7);
  })));
});