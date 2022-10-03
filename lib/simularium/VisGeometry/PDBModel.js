"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

require("regenerator-runtime/runtime");

var Comlink = _interopRequireWildcard(require("comlink"));

var _parsePdb = _interopRequireDefault(require("parse-pdb"));

var _parseMmcif = _interopRequireDefault(require("parse-mmcif"));

var _three = require("three");

var _KMeans3d = _interopRequireDefault(require("./rendering/KMeans3d"));

var _TaskQueue = _interopRequireDefault(require("../TaskQueue"));

var _InstancedMesh = require("./rendering/InstancedMesh");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var PDBModel = /*#__PURE__*/function () {
  // number of atoms for each level of detail
  // cancelled means we have abandoned this pdb
  // and if it is still initializing, it should be dropped/ignored as soon as processing is done
  function PDBModel(filePath) {
    (0, _classCallCheck2["default"])(this, PDBModel);
    (0, _defineProperty2["default"])(this, "filePath", void 0);
    (0, _defineProperty2["default"])(this, "name", void 0);
    (0, _defineProperty2["default"])(this, "pdb", void 0);
    (0, _defineProperty2["default"])(this, "lodSizes", void 0);
    (0, _defineProperty2["default"])(this, "lods", void 0);
    (0, _defineProperty2["default"])(this, "bounds", void 0);
    (0, _defineProperty2["default"])(this, "_cancelled", void 0);
    this.filePath = filePath;
    this.name = filePath;
    this.pdb = null;
    this.lods = [];
    this.lodSizes = [];
    this._cancelled = false;
    this.bounds = new _three.Box3();
  }

  (0, _createClass2["default"])(PDBModel, [{
    key: "cancelled",
    get: function get() {
      return this._cancelled;
    },
    set: function set(cancelled) {
      this._cancelled = cancelled;
    }
  }, {
    key: "getNumAtoms",
    value: function getNumAtoms() {
      return this.pdb ? this.pdb.atoms.length : 0;
    }
  }, {
    key: "parse",
    value: function parse(data, fileExtension) {
      // It would be great if we could distinguish the formats only from the data content.
      // Files from the PDB seem to follow this convention:
      // .pdb files start with "HEADER"
      // .cif files start with "data_"
      // but we have encountered other .pdb files that do not begin with "HEADER".
      if (fileExtension === "pdb") {
        this.parsePDBData(data);
      } else if (fileExtension === "cif") {
        this.parseCIFData(data);
      } else {
        throw new Error("Expected .cif or .pdb file extension to parse PDB data, but got ".concat(fileExtension));
      }
    }
  }, {
    key: "parseCIFData",
    value: function parseCIFData(data) {
      this.pdb = (0, _parseMmcif["default"])(data);

      if (this.pdb.atoms.length > 0) {
        this.fixupCoordinates();
        console.log("PDB ".concat(this.name, " has ").concat(this.pdb.atoms.length, " atoms"));
        this.checkChains();
        return this.initializeLOD();
      }
    }
  }, {
    key: "parsePDBData",
    value: function parsePDBData(data) {
      // NOTE: pdb atom coordinates are in angstroms
      // 1 nm is 10 angstroms
      this.pdb = (0, _parsePdb["default"])(data);

      if (this.pdb.atoms.length > 0) {
        this.fixupCoordinates();
        console.log("PDB ".concat(this.name, " has ").concat(this.pdb.atoms.length, " atoms"));
        this.checkChains();
        return this.initializeLOD();
      }
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


      var PDB_COORDINATE_SCALE = new _three.Vector3(0.1, 0.1, 0.1);

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

      this.bounds = new _three.Box3(new _three.Vector3(minx, miny, minz), new _three.Vector3(maxx, maxy, maxz));
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
      var geometry = new _three.BufferGeometry();
      var n = coordinates.length / 3;
      var vertices = new Float32Array(n * 4); // FUTURE: Add residue and chain information when we want it to matter for display

      for (var j = 0; j < n; j++) {
        vertices[j * 4] = coordinates[j * 3];
        vertices[j * 4 + 1] = coordinates[j * 3 + 1];
        vertices[j * 4 + 2] = coordinates[j * 3 + 2];
        vertices[j * 4 + 3] = 1;
      }

      geometry.setAttribute("position", new _three.Float32BufferAttribute(vertices, 4));
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

      var n = this.pdb.atoms.length; // levels of detail go from most detailed to least

      this.lodSizes = [n, Math.max(Math.floor(n / 8), 1), Math.max(Math.floor(n / 32), 1), Math.max(Math.floor(n / 128), 1)]; // select random points for the initial quick LOD guess.
      // alternative strategy:
      // for small atom counts, apply kmeans synchronously
      // put all the points in a flat array

      var allData = this.makeFlatPositionArray(); // fill LOD 0 with the raw points

      var lod0 = allData.slice();
      var geometry0 = this.createGPUBuffer(lod0);
      this.lods.push({
        geometry: geometry0,
        vertices: lod0,
        instances: new _InstancedMesh.InstancedMesh(_InstancedMesh.InstanceType.POINTS, geometry0, this.name + "_LOD0", 0)
      }); // start at 1, and add the rest

      for (var i = 1; i < this.lodSizes.length; ++i) {
        var lodData = _KMeans3d["default"].randomSeeds(this.lodSizes[i], allData);

        var geometry = this.createGPUBuffer(lodData);
        this.lods.push({
          geometry: geometry,
          vertices: lodData,
          instances: new _InstancedMesh.InstancedMesh(_InstancedMesh.InstanceType.POINTS, geometry, this.name + "_LOD" + i, 0)
        });
      }
    }
  }, {
    key: "generateLOD",
    value: function () {
      var _generateLOD = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
        var _this = this;

        var n, allData, sizes, retData, i, lodIndex, geometry;
        return _regenerator["default"].wrap(function _callee$(_context) {
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
                return _TaskQueue["default"].enqueue(function () {
                  return _this.processPdbLod(n, sizes, allData);
                });

              case 8:
                retData = _context.sent;

                // ... continue on when it's done
                // update the new LODs
                for (i = 0; i < sizes.length; ++i) {
                  lodIndex = i + 1; // if old LOD existed we can dispose now.

                  if (this.lods[lodIndex]) {
                    this.lods[lodIndex].instances.dispose();
                  }

                  geometry = this.createGPUBuffer(retData[i]);
                  this.lods[lodIndex] = {
                    geometry: geometry,
                    vertices: retData[i],
                    instances: new _InstancedMesh.InstancedMesh(_InstancedMesh.InstanceType.POINTS, geometry, this.name + "_LOD" + lodIndex, 0)
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
    key: "numLODs",
    value: function numLODs() {
      return this.lods.length;
    }
  }, {
    key: "getLOD",
    value: function getLOD(index) {
      if (index < 0 || index >= this.lods.length) {
        index = this.lods.length - 1;
      }

      return this.lods[index].instances;
    }
  }, {
    key: "beginUpdate",
    value: function beginUpdate() {
      for (var i = 0; i < this.lods.length; ++i) {
        this.lods[i].instances.beginUpdate();
      }
    }
  }, {
    key: "endUpdate",
    value: function endUpdate() {
      for (var i = 0; i < this.lods.length; ++i) {
        this.lods[i].instances.endUpdate();
      }
    }
  }, {
    key: "instantiate",
    value: function instantiate() {
      var lodobjects = [];

      for (var i = 0; i < this.lods.length; ++i) {
        var obj = new _three.Points(this.lods[i].geometry);
        obj.visible = false;
        lodobjects.push(obj);
      }

      return lodobjects;
    }
  }, {
    key: "processPdbLod",
    value: function () {
      var _processPdbLod = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(n, sizes, allData) {
        var worker, kMeansWorkerClass, workerobj, retData;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                // https://webpack.js.org/guides/web-workers/#syntax
                worker = new Worker(new URL("./KMeansWorker.ts", import.meta.url));
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

var _default = PDBModel;
exports["default"] = _default;