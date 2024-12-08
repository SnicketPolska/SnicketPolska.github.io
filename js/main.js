// zmienne globalne
var gl_canvas;
var gl_ctx;
var viewport = 1.0;

var _position;
var _color;
var _uv;
var _sampler;
var _cubeVertexBuffer;
var _cubeFacesBuffer;
var _tetrahedronVertexBuffer;
var _tetrahedronFacesBuffer;
var _PosMatrix;
var _MovMatrix;
var _ViewMatrix;
var _matrixProjection;
var _matrixMovement;
var _matrixView;
var _cubeTexture_1;
var _cubeTexture_2;
var _cubeTexture_3;
var _whitePixel;
var rotationSpeed = 0.001;
var zoomRatio = -6;
var X, Y, Z;
var model = 0;
var texture = 1;

function onConfigChange() {
  model = document.querySelector('input[name="model"]:checked').value;
  if (model === "tetrahedronModel") {
    document.querySelectorAll('input[name="texture"]').forEach(function (el) {
      el.disabled = true;
      texture = 0
    });
  } else {
    document.querySelectorAll('input[name="texture"]').forEach(function (el) {
      el.disabled = false;
    });
    texture = document.querySelector('input[name="texture"]:checked').value;
  }


  X = document.getElementById("rotateX").checked;
  Y = document.getElementById("rotateY").checked;
  Z = document.getElementById("rotateZ").checked;
}

// funkcja główna
function runWebGL() {
  gl_ctx = gl_initialize();
  onConfigChange();

  gl_initShaders();
  gl_initBuffers();
  gl_setMatrix();
  _cubeTexture_1 = gl_initTexture("https://raw.githubusercontent.com/SnicketPolska/SnicketPolska.github.io/refs/heads/master/docs/assets/cubetexture.png");
  _cubeTexture_2 = gl_initTexture("https://raw.githubusercontent.com/SnicketPolska/SnicketPolska.github.io/refs/heads/master/docs/assets/cubetexture2.png");
  _cubeTexture_3 = gl_initTexture("https://raw.githubusercontent.com/SnicketPolska/SnicketPolska.github.io/refs/heads/master/docs/assets/cubetexture3.png");
  _whitePixel  = gl_ctx.createTexture();
  gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, _whitePixel);
  var whitePixel = new Uint8Array([255, 255, 255]);
  gl_ctx.texImage2D(gl_ctx.TEXTURE_2D, 0, gl_ctx.RGB, 1, 1, 0,
    gl_ctx.RGB, gl_ctx.UNSIGNED_BYTE, whitePixel);
  gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, null);
  gl_draw();
}

function gl_initialize() {
  gl_canvas = document.getElementById("glcanvas");
  var wrapper = gl_canvas.parentNode;

  gl_canvas.setAttribute("width", window.getComputedStyle(wrapper).width);
  gl_canvas.setAttribute("height", window.getComputedStyle(wrapper).height);
  viewport =
    parseFloat(window.getComputedStyle(wrapper).height) /
    parseFloat(window.getComputedStyle(wrapper).width);
  addEventListener("resize", () => {
    gl_canvas.setAttribute("width", window.getComputedStyle(wrapper).width);
    gl_canvas.setAttribute(
      "height",
      parseFloat(window.getComputedStyle(wrapper).width) * viewport,
    );
  });
  return gl_getContext(gl_canvas);
}

function resetPos() {
  _matrixMovement = MATRIX.getIdentityMatrix();
}

// pobranie kontekstu WebGL
function gl_getContext(canvas) {
  try {
    var ctx = canvas.getContext("webgl");
    ctx.viewportWidth = canvas.width;
    ctx.viewportHeight = canvas.height;
  } catch (e) {}
  if (!ctx) {
    document.write("Nieudana inicjalizacja kontekstu WebGL.");
  }
  return ctx;
}

// shadery
function gl_initShaders() {
  var vertexShader =
    "\n\
 attribute vec3 position;\n\
 uniform mat4 PosMatrix;\n\
 uniform mat4 MovMatrix;\n\
 uniform mat4 ViewMatrix; \n\
 attribute vec3 color;\n\
 varying vec3 vColor;\n\
 attribute vec2 uv;\n\
 varying vec2 vUV;\n\
 void main(void) {\n\
 gl_Position = PosMatrix * ViewMatrix * MovMatrix *  vec4(position, 1.);\n\
 vColor = color;\n\
 vUV = uv;\n\
}";
  var fragmentShader =
    "\n\
 precision mediump float;\n\
 uniform sampler2D sampler;\n\
 varying vec3 vColor;\n\
 varying vec2 vUV;\n\
 void main(void) {\n\
 gl_FragColor = texture2D(sampler, vUV) * vec4(vColor, 1.);\n\
 }";
  var getShader = function (source, type, typeString) {
    var shader = gl_ctx.createShader(type);
    gl_ctx.shaderSource(shader, source);
    gl_ctx.compileShader(shader);
    if (!gl_ctx.getShaderParameter(shader, gl_ctx.COMPILE_STATUS)) {
      alert("error in " + typeString);
      return false;
    }
    return shader;
  };
  var shaderVertex = getShader(vertexShader, gl_ctx.VERTEX_SHADER, "VERTEX");
  var shaderFragment = getShader(
    fragmentShader,
    gl_ctx.FRAGMENT_SHADER,
    "FRAGMENT",
  );
  var shaderProgram = gl_ctx.createProgram();

  gl_ctx.attachShader(shaderProgram, shaderVertex);
  gl_ctx.attachShader(shaderProgram, shaderFragment);
  gl_ctx.linkProgram(shaderProgram);

  _PosMatrix = gl_ctx.getUniformLocation(shaderProgram, "PosMatrix");
  _MovMatrix = gl_ctx.getUniformLocation(shaderProgram, "MovMatrix");
  _ViewMatrix = gl_ctx.getUniformLocation(shaderProgram, "ViewMatrix");

  _sampler = gl_ctx.getUniformLocation(shaderProgram, "sampler");
  _uv = gl_ctx.getAttribLocation(shaderProgram, "uv");

  _position = gl_ctx.getAttribLocation(shaderProgram, "position");
  _color = gl_ctx.getAttribLocation(shaderProgram, "color");

  gl_ctx.enableVertexAttribArray(_position);
  gl_ctx.enableVertexAttribArray(_color);
  gl_ctx.enableVertexAttribArray(_uv);
  gl_ctx.useProgram(shaderProgram);
  gl_ctx.uniform1i(_sampler, 0);
}

// bufory
function gl_initBuffers() {
  _cubeVertexBuffer = gl_ctx.createBuffer();
  gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _cubeVertexBuffer);
  gl_ctx.bufferData(
    gl_ctx.ARRAY_BUFFER,
    new Float32Array(cubeVerticesUV),
    gl_ctx.STATIC_DRAW,
  );
  _cubeFacesBuffer = gl_ctx.createBuffer();
  gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _cubeFacesBuffer);
  gl_ctx.bufferData(
    gl_ctx.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(cubeFacesUV),
    gl_ctx.STATIC_DRAW,
  );
  _tetrahedronVertexBuffer = gl_ctx.createBuffer();
  gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _tetrahedronVertexBuffer);
  gl_ctx.bufferData(
    gl_ctx.ARRAY_BUFFER,
    new Float32Array(tetrahedronVertices),
    gl_ctx.STATIC_DRAW,
  );
  _tetrahedronFacesBuffer = gl_ctx.createBuffer();
  gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _tetrahedronFacesBuffer);
  gl_ctx.bufferData(
    gl_ctx.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(tetrahedronFaces),
    gl_ctx.STATIC_DRAW,
  );
}

function gl_setMatrix() {
  _matrixProjection = MATRIX.getProjection(
    40,
    gl_canvas.width / gl_canvas.height,
    1,
    100,
  );
  _matrixMovement = MATRIX.getIdentityMatrix();
  _matrixView = MATRIX.getIdentityMatrix();
  MATRIX.translateZ(_matrixView, zoomRatio);
}

function gl_initTexture(src) {
  var img = new Image();
  img.src = src;
  img.webglTexture = false;
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    var texture = gl_ctx.createTexture();
    gl_ctx.pixelStorei(gl_ctx.UNPACK_FLIP_Y_WEBGL, true);
    gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, texture);
    gl_ctx.texParameteri(
      gl_ctx.TEXTURE_2D,
      gl_ctx.TEXTURE_MIN_FILTER,
      gl_ctx.LINEAR,
    );
    gl_ctx.texParameteri(
      gl_ctx.TEXTURE_2D,
      gl_ctx.TEXTURE_MAG_FILTER,
      gl_ctx.LINEAR,
    );
    gl_ctx.texImage2D(
      gl_ctx.TEXTURE_2D,
      0,
      gl_ctx.RGBA,
      gl_ctx.RGBA,
      gl_ctx.UNSIGNED_BYTE,
      img,
    );
    gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, null);
    img.webglTexture = texture;
  };
  return img;
}

// rysowanie
function gl_draw() {
  gl_ctx.clearColor(0.0, 0.0, 0.0, 0.0);
  gl_ctx.enable(gl_ctx.DEPTH_TEST);
  gl_ctx.depthFunc(gl_ctx.LEQUAL);
  gl_ctx.clearDepth(1.0);
  var timeOld = 0;

  var animate = function (time) {
    var dAngle = rotationSpeed * (time - timeOld);
    if (X) {
      MATRIX.rotateX(_matrixMovement, dAngle);
    }
    if (Y) {
      MATRIX.rotateY(_matrixMovement, dAngle);
    }
    if (Z) {
      MATRIX.rotateZ(_matrixMovement, dAngle);
    }
    timeOld = time;
    gl_ctx.viewport(0.0, 0.0, gl_canvas.width, gl_canvas.height);
    gl_ctx.clear(gl_ctx.COLOR_BUFFER_BIT | gl_ctx.DEPTH_BUFFER_BIT);
    gl_ctx.uniformMatrix4fv(_PosMatrix, false, _matrixProjection);
    gl_ctx.uniformMatrix4fv(_MovMatrix, false, _matrixMovement);
    gl_ctx.uniformMatrix4fv(_ViewMatrix, false, _matrixView);

    if (
      _cubeTexture_1.webglTexture &&
      _cubeTexture_2.webglTexture &&
      _cubeTexture_3.webglTexture
    ) {
      gl_ctx.activeTexture(gl_ctx.TEXTURE0);
      switch (texture) {
        case "1":
          gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, _cubeTexture_1.webglTexture);
          break;
        case "2":
          gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, _cubeTexture_2.webglTexture);
          break;
        case "3":
          gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, _cubeTexture_3.webglTexture);
          break;
        default:
          gl_ctx.bindTexture(gl_ctx.TEXTURE_2D, _whitePixel);
          break;
      }
    }

    gl_ctx.vertexAttribPointer(
      _position,
      3,
      gl_ctx.FLOAT,
      false,
      4 * (3 + 3 + 2),
      0,
    );
    gl_ctx.vertexAttribPointer(
      _color,
      3,
      gl_ctx.FLOAT,
      false,
      4 * (3 + 3 + 2),
      3 * 4,
    );
    gl_ctx.vertexAttribPointer(
      _uv,
      2,
      gl_ctx.FLOAT,
      false,
      4 * (3 + 3 + 2),
      6 * 4,
    );

    if (model === "cubeModel") {
      gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _cubeVertexBuffer);
      gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _cubeFacesBuffer);
      gl_ctx.drawElements(
        gl_ctx.TRIANGLES,
        6 * 2 * 3,
        gl_ctx.UNSIGNED_SHORT,
        0,
      );
    } else {
      gl_ctx.bindBuffer(gl_ctx.ARRAY_BUFFER, _tetrahedronVertexBuffer);
      gl_ctx.bindBuffer(gl_ctx.ELEMENT_ARRAY_BUFFER, _tetrahedronFacesBuffer);
      gl_ctx.drawElements(gl_ctx.TRIANGLES, 4 * 3, gl_ctx.UNSIGNED_SHORT, 0);
    }

    gl_ctx.flush();
    window.requestAnimationFrame(animate);
  };
  animate(0);
}
