function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import "regenerator-runtime/runtime";
import * as Comlink from "comlink";
import parsePdb from "parse-pdb";
import { Box3, BufferGeometry, Float32BufferAttribute, Points, Vector3 } from "three";
import KMeansWorkerModule from "./worker/KMeansWorker";
import KMeans from "./rendering/KMeans3d";
import TaskQueue from "./worker/TaskQueue";
import { REASON_CANCELLED } from "./worker/TaskQueue";

var PDBModel = /*#__PURE__*/function () {
  // number of atoms for each level of detail
  // cancelled means we have abandoned this pdb
  // and if it is still initializing, it should be dropped/ignored as soon as processing is done
  function PDBModel(filePath) {
    _classCallCheck(this, PDBModel);

    _defineProperty(this, "filePath", void 0);

    _defineProperty(this, "name", void 0);

    _defineProperty(this, "pdb", void 0);

    _defineProperty(this, "lodSizes", void 0);

    _defineProperty(this, "lods", void 0);

    _defineProperty(this, "bounds", void 0);

    _defineProperty(this, "cancelled", void 0);

    this.filePath = filePath;
    this.name = filePath;
    this.pdb = null;
    this.lods = [];
    this.lodSizes = [];
    this.cancelled = false;
    this.bounds = new Box3();
  }

  _createClass(PDBModel, [{
    key: "setCancelled",
    value: function setCancelled() {
      this.cancelled = true;
    }
  }, {
    key: "isCancelled",
    value: function isCancelled() {
      return this.cancelled;
    }
  }, {
    key: "getNumAtoms",
    value: function getNumAtoms() {
      return this.pdb ? this.pdb.atoms.length : 0;
    }
  }, {
    key: "download",
    value: function download(url) {
      var _this = this;

      var pdbRequest = new Request(url);
      return fetch(pdbRequest).then(function (response) {
        if (!response.ok) {
          throw new Error("Error fetching ".concat(_this.filePath, " from ").concat(url));
        }

        return response.text();
      }).then(function (data) {
        if (_this.cancelled) {
          return Promise.reject(REASON_CANCELLED);
        } // note pdb atom coordinates are in angstroms
        // 1 nm is 10 angstroms


        _this.pdb = parsePdb(data);

        if (_this.pdb.atoms.length > 0) {
          _this.fixupCoordinates();

          console.log("PDB ".concat(_this.name, " has ").concat(_this.pdb.atoms.length, " atoms"));

          _this.checkChains();

          return _this.initializeLOD();
        }
      });
    } // build a fake random pdb

  }, {
    key: "create",
    value: function create(nAtoms) {
      var atomSpread = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
      var atoms = []; // always put one atom at the center

      atoms.push({
        x: 0,
        y: 0,
        z: 0
      });

      for (var i = 1; i < nAtoms; ++i) {
        atoms.push({
          x: (Math.random() - 0.5) * atomSpread,
          y: (Math.random() - 0.5) * atomSpread,
          z: (Math.random() - 0.5) * atomSpread
        });
      }

      this.pdb = {
        atoms: atoms,
        seqRes: [],
        residues: [],
        chains: new Map()
      };
      this.fixupCoordinates();
      this.initializeLOD();
      return Promise.resolve();
    }
  }, {
    key: "fixupCoordinates",
    value: function fixupCoordinates() {
      if (!this.pdb) {
        return;
      } // PDB Angstroms to Simularium nanometers


      var PDB_COORDINATE_SCALE = new Vector3(0.1, 0.1, 0.1);

      for (var i = 0; i < this.pdb.atoms.length; ++i) {
        this.pdb.atoms[i].x *= PDB_COORDINATE_SCALE.x;
        this.pdb.atoms[i].y *= PDB_COORDINATE_SCALE.y;
        this.pdb.atoms[i].z *= PDB_COORDINATE_SCALE.z;
      } // compute bounds:


      var minx = this.pdb.atoms[0].x;
      var miny = this.pdb.atoms[0].x;
      var minz = this.pdb.atoms[0].x;
      var maxx = this.pdb.atoms[0].x;
      var maxy = this.pdb.atoms[0].x;
      var maxz = this.pdb.atoms[0].x;

      for (var _i = 1; _i < this.pdb.atoms.length; ++_i) {
        maxx = Math.max(maxx, this.pdb.atoms[_i].x);
        maxy = Math.max(maxy, this.pdb.atoms[_i].y);
        maxz = Math.max(maxz, this.pdb.atoms[_i].z);
        minx = Math.min(minx, this.pdb.atoms[_i].x);
        miny = Math.min(miny, this.pdb.atoms[_i].y);
        minz = Math.min(minz, this.pdb.atoms[_i].z);
      }

      this.bounds = new Box3(new Vector3(minx, miny, minz), new Vector3(maxx, maxy, maxz));
    }
  }, {
    key: "checkChains",
    value: function checkChains() {
      if (!this.pdb) {
        return;
      }

      if (!this.pdb.chains) {
        this.pdb.chains = new Map();
      }

      if (!this.pdb.chains.size) {
        for (var i = 0; i < this.pdb.atoms.length; ++i) {
          var atom = this.pdb.atoms[i];

          if (atom.chainID && !this.pdb.chains.get(atom.chainID)) {
            this.pdb.chains.set(atom.chainID, {
              id: this.pdb.chains.size,
              chainID: atom.chainID,
              // No need to save numRes, can just do chain.residues.length
              residues: []
            });
          }
        }
      }
    }
  }, {
    key: "createGPUBuffer",
    value: function createGPUBuffer(coordinates) {
      var geometry = new BufferGeometry();
      var n = coordinates.length / 3;
      var vertices = new Float32Array(n * 4); // FUTURE: Add residue and chain information when we want it to matter for display

      for (var j = 0; j < n; j++) {
        vertices[j * 4] = coordinates[j * 3];
        vertices[j * 4 + 1] = coordinates[j * 3 + 1];
        vertices[j * 4 + 2] = coordinates[j * 3 + 2];
        vertices[j * 4 + 3] = 1;
      }

      geometry.setAttribute("position", new Float32BufferAttribute(vertices, 4));
      return geometry;
    }
  }, {
    key: "makeFlatPositionArray",
    value: function makeFlatPositionArray() {
      if (!this.pdb) {
        console.error("makeFlatPositionArray: pdb not loaded yet");
        return new Float32Array();
      }

      var n = this.pdb.atoms.length; // put all the points in a flat array

      var allData = new Float32Array(n * 3);

      for (var i = 0; i < n; i++) {
        allData[i * 3] = this.pdb.atoms[i].x;
        allData[i * 3 + 1] = this.pdb.atoms[i].y;
        allData[i * 3 + 2] = this.pdb.atoms[i].z;
      }

      return allData;
    }
  }, {
    key: "initializeLOD",
    value: function initializeLOD() {
      if (!this.pdb) {
        console.error("initializeLOD called with no pdb data");
        return;
      }

      var n = this.pdb.atoms.length;
      this.lodSizes = [n, Math.max(Math.floor(n / 8), 1), Math.max(Math.floor(n / 32), 1), Math.max(Math.floor(n / 128), 1)]; // select random points for the initial quick LOD guess.
      // alternative strategy:
      // for small atom counts, apply kmeans synchronously
      // put all the points in a flat array

      var allData = this.makeFlatPositionArray(); // fill LOD 0 with the raw points

      var lod0 = allData.slice();
      var geometry0 = this.createGPUBuffer(lod0);
      this.lods.push({
        geometry: geometry0,
        vertices: lod0
      }); // start at 1, and add the rest

      for (var i = 1; i < this.lodSizes.length; ++i) {
        var loddata = KMeans.randomSeeds(this.lodSizes[i], allData);
        this.lods.push({
          geometry: this.createGPUBuffer(loddata),
          vertices: loddata
        });
      }
    }
  }, {
    key: "generateLOD",
    value: function () {
      var _generateLOD = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
        var _this2 = this;

        var n, allData, sizes, retData, i;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(!this.pdb || this.lods.length < 4)) {
                  _context.next = 3;
                  break;
                }

                console.log("generateLOD called with no pdb data or uninitialized LODs");
                return _context.abrupt("return", Promise.resolve());

              case 3:
                n = this.pdb.atoms.length; // put all the points in a flat array

                allData = this.makeFlatPositionArray();
                sizes = this.lodSizes.slice(1); // Enqueue this LOD calculation

                _context.next = 8;
                return TaskQueue.enqueue(function () {
                  return _this2.processPdbLod(n, sizes, allData);
                });

              case 8:
                retData = _context.sent;

                // ... continue on when it's done
                // update the new LODs
                for (i = 0; i < sizes.length; ++i) {
                  this.lods[i + 1] = {
                    geometry: this.createGPUBuffer(retData[i]),
                    vertices: retData[i]
                  };
                }

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function generateLOD() {
        return _generateLOD.apply(this, arguments);
      }

      return generateLOD;
    }()
  }, {
    key: "instantiate",
    value: function instantiate() {
      var lodobjects = [];

      for (var i = 0; i < this.lods.length; ++i) {
        var obj = new Points(this.lods[i].geometry);
        obj.visible = false;
        lodobjects.push(obj);
      }

      return lodobjects;
    }
  }, {
    key: "processPdbLod",
    value: function () {
      var _processPdbLod = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(n, sizes, allData) {
        var worker, kMeansWorkerClass, workerobj, retData;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                worker = new KMeansWorkerModule();
                kMeansWorkerClass = Comlink.wrap(worker);
                _context2.next = 4;
                return new kMeansWorkerClass();

              case 4:
                workerobj = _context2.sent;
                _context2.next = 7;
                return workerobj.run(n, sizes, Comlink.transfer(allData, [allData.buffer]));

              case 7:
                retData = _context2.sent;
                worker.terminate();
                return _context2.abrupt("return", retData);

              case 10:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      function processPdbLod(_x, _x2, _x3) {
        return _processPdbLod.apply(this, arguments);
      }

      return processPdbLod;
    }()
  }]);

  return PDBModel;
}();

export default PDBModel;