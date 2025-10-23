import * as THREE from 'three';

/**
 * Mendefinisikan tipe-tipe objek yang dapat digambar dan dikelola oleh riwayat (undo/redo).
 * Bisa berupa garis (Line) atau mesh 3D (Mesh).
 */
type DrawableObject = THREE.Line | THREE.Mesh;

/**
 * Memperluas antarmuka standar THREE.ExtrudeGeometryOptions dengan properti opsional untuk kejelasan.
 */

/**
 * Sebuah alat untuk menggambar polyline di scene THREE.js, yang kemudian diekstrusi menjadi mesh 3D.
 * Alat ini menangani klik mouse untuk menempatkan titik, menampilkan pratinjau segmen garis berikutnya,
 * dan menyelesaikan bentuk saat terjadi double-click. Alat ini juga mendukung fungsionalitas undo/redo.
 */
export class LineTool {
  /** Jumlah maksimum titik yang dapat ditampung oleh sebuah polyline sebelum buffer perlu dialokasi ulang. */
  private readonly MAX_POINTS = 1000;

  /** Sebuah flag untuk menandakan apakah pengguna sedang dalam proses menggambar polyline. */
  private isDrawing = false;
  /** Sebuah array untuk menyimpan vertex (titik) dari polyline yang sedang digambar. */
  private points: THREE.Vector3[] = [];
  /** Objek THREE.Line yang merepresentasikan polyline yang sedang digambar saat ini. */
  private currentLine: THREE.Line | null = null;
  /** Scene utama THREE.js tempat semua objek dirender. */
  private scene: THREE.Scene;
  /** Kamera yang digunakan untuk raycasting guna menentukan posisi 3D dari klik mouse. */
  private camera: THREE.Camera;
  /** Renderer WebGL, digunakan untuk mendapatkan elemen canvas untuk event listener. */
  private renderer: THREE.WebGLRenderer;
  /** Sebuah fungsi callback yang dipanggil ketika proses menggambar dibatalkan (misalnya, dengan menekan Esc). */
  private onCancel: (() => void) | null = null;
  /** Sebuah array yang menyimpan riwayat mesh yang telah dibuat untuk operasi undo/redo. */
  private history: DrawableObject[] = [];
  /** Indeks saat ini di dalam array riwayat, menunjuk ke objek terakhir yang dibuat. */
  private historyIndex: number = -1;
  /** Sebuah array untuk menampung garis sementara, seperti garis pratinjau yang mengikuti kursor mouse. */
  private tempLines: THREE.Line[] = [];
  
  // This variable is not used in the current implementation
  // Keeping it for potential future use
  private controls?: {
    enabled: boolean;
  };
  /** Sebuah timer untuk membantu membedakan antara klik tunggal dan klik ganda. */
  private doubleClickTimer: number | null = null;
  /** Sebuah penghitung untuk klik mouse guna mendeteksi klik ganda. */
  private clickCount = 0;
  /** Menyimpan mesh yang paling baru dibuat, meskipun tidak digunakan secara aktif di versi ini. */

  /**
   * Membuat instance LineTool.
   * @param scene Scene THREE.js untuk menggambar.
   * @param camera Kamera THREE.js untuk perhitungan koordinat.
   * @param renderer Renderer THREE.js untuk melampirkan event listener.
   * @param onCancel Fungsi callback untuk dieksekusi saat gambar dibatalkan.
   * @param controls Kontrol untuk mengaktifkan atau menonaktifkan kontrol.
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    onCancel: () => void,
    controls?: {
      enabled: boolean;
    }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.onCancel = onCancel;
  }

  /**
   * Menangani event keydown. Jika tombol 'Escape' ditekan saat menggambar, proses akan dibatalkan.
   * @param event Objek KeyboardEvent.
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isDrawing) {
      this.cancelDrawing();
    }
  };

  /**
   * Membatalkan operasi menggambar saat ini. Menghapus garis sementara, mereset status,
   * dan memanggil callback onCancel.
   */
  private cancelDrawing() {
    if (this.currentLine) {
      this.scene.remove(this.currentLine);
      this.currentLine.geometry.dispose();
      (this.currentLine.material as THREE.Material).dispose();
    }
    this.clearTempLines();
    this.resetDrawing();
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Menghitung titik potong (intersection) 3D di dalam scene berdasarkan koordinat mouse 2D.
   * @param event Objek MouseEvent yang berisi koordinat clientX dan clientY.
   * @returns Sebuah THREE.Vector3 yang merepresentasikan titik potong, atau null jika tidak ditemukan.
   */
  private getIntersectionPoint(event: MouseEvent, useFixedDistance: boolean = false): THREE.Vector3 | null {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // Get camera position and direction
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    
    // If we have existing points, create a plane for free-form drawing
    if (this.points.length > 0 && !useFixedDistance) {
      const lastPoint = this.points[this.points.length - 1];
      
      // Create a plane that's perpendicular to the view direction but aligned with the last point
      const cameraToPoint = new THREE.Vector3().subVectors(cameraPosition, lastPoint).normalize();
      const planeNormal = cameraToPoint.clone().normalize();
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, lastPoint);
      
      // Find intersection with this plane
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        // Limit the distance from the last point to prevent lines from being too long
        const maxDistance = 5; // Maximum distance in world units
        const distance = lastPoint.distanceTo(intersection);
        if (distance > maxDistance) {
          const direction = new THREE.Vector3().subVectors(intersection, lastPoint).normalize();
          return lastPoint.clone().add(direction.multiplyScalar(maxDistance));
        }
        return intersection;
      }
    }
    
    // If no existing points or plane intersection failed, try intersecting with scene objects
    const drawableObjects: THREE.Object3D[] = [];
    
    // Add all meshes in the scene that we can draw on
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Skip if this is one of our temporary drawing objects
        const isTempLine = this.tempLines.some(line => line.uuid === object.uuid);
        const isCurrentLine = this.currentLine && this.currentLine.uuid === object.uuid;
        if (!isTempLine && !isCurrentLine) {
          drawableObjects.push(object);
        }
      }
    });
    
    // Find intersections with all objects in the scene
    const intersects = raycaster.intersectObjects(drawableObjects, true);
    
    if (intersects.length > 0) {
      // For the first point, use the exact intersection
      if (this.points.length === 0 || useFixedDistance) {
        return intersects[0].point;
      }
      
      // For subsequent points, limit the distance from the last point
      const lastPoint = this.points[this.points.length - 1];
      const maxDistance = 5; // Maximum distance in world units
      const direction = new THREE.Vector3().subVectors(intersects[0].point, lastPoint);
      const distance = direction.length();
      
      if (distance > maxDistance) {
        return lastPoint.clone().add(direction.normalize().multiplyScalar(maxDistance));
      }
      return intersects[0].point;
    }
    
    // If no intersection with objects, create a point at a fixed distance from camera
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    
    // Calculate a point 3 units in front of the camera (reduced from 10)
    return cameraPosition.clone().add(cameraDirection.multiplyScalar(3));
  }

  /**
   * Fungsi bantuan untuk membuat objek THREE.Line sederhana, biasanya untuk garis pratinjau.
   * @param points Sebuah array dari titik THREE.Vector3.
   * @returns Sebuah objek THREE.Line.
   */
  private createLine(points: THREE.Vector3[]): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff00,  // Green color for better visibility
      linewidth: 2,
      linecap: 'round',
      linejoin: 'round',
      transparent: true,
      opacity: 0.9
    });
    
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1; // Ensure lines are rendered on top
    
    // Enable line to be selectable and cast/receive shadows
    line.castShadow = true;
    line.receiveShadow = true;
    
    return line;
  }

  /**
   * Menangani satu kali klik mouse. Ini bisa memulai polyline baru atau menambahkan titik ke polyline yang ada.
   * @param point Titik 3D tempat klik terjadi.
   */
  private handleSingleClick = (point: THREE.Vector3) => {
    if (!this.isDrawing) {
      // First click: Start a new drawing.
      this.isDrawing = true;
      this.points = [point.clone()];

      // Create a new line with dynamic buffer
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.MAX_POINTS * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Create a more visible line material
      const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 2,
        linecap: 'round',
        linejoin: 'round'
      });
      
      this.currentLine = new THREE.Line(geometry, material);
      this.currentLine.frustumCulled = false;
      this.scene.add(this.currentLine);

      // Store the initial point
      const positionsAttribute = this.currentLine.geometry.attributes.position as THREE.BufferAttribute;
      positionsAttribute.setXYZ(0, point.x, point.y, point.z);
      
      // Create a preview line for the next segment
      const previewLine = this.createLine([point.clone(), point.clone()]);
      this.tempLines.push(previewLine);
      this.scene.add(previewLine);

    } else {
      // Add a new point to the current line
      this.points.push(point.clone());
      
      if (this.currentLine) {
        const geometry = this.currentLine.geometry as THREE.BufferGeometry;
        const positions = geometry.attributes.position as THREE.BufferAttribute;
        
        // Update all points including the new one
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          positions.setXYZ(i, p.x, p.y, p.z);
        }
        
        // Set the draw range to include all points
        geometry.setDrawRange(0, this.points.length);
        positions.needsUpdate = true;
        
        // Update the bounding sphere for better rendering
        geometry.computeBoundingSphere();
      }
      
      // Update the preview line for the next segment
      this.clearTempLines();
      const previewLine = this.createLine([point.clone(), point.clone()]);
      this.tempLines.push(previewLine);
      this.scene.add(previewLine);
    }
  };

  /**
   * Membuat mesh 3D yang diekstrusi dari serangkaian titik 2D pada bidang XZ.
   * @param points Array dari titik THREE.Vector3 yang membentuk polyline.
   * @returns Sebuah objek THREE.Mesh, atau null jika titik tidak cukup.
   */
  private createMeshFromPoints(points: THREE.Vector3[]): THREE.Mesh | null {
    if (points.length < 3) return null; // Need at least 3 points to form a face

    // Calculate the normal of the plane formed by the first three points
    const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
    const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    
    // Create a group to hold the mesh
    const group = new THREE.Group();
    
    // Create a 3D shape using the points
    const shape = new THREE.Shape();
    
    // Project 3D points onto a 2D plane for the shape
    // We'll use the first point as the origin
    const origin = points[0].clone();
    
    // Create two basis vectors for the plane
    const up = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(up, normal).normalize();
    if (right.length() < 0.0001) {
      // If normal is parallel to up vector, use a different basis
      right = new THREE.Vector3(1, 0, 0);
    }
    const forward = new THREE.Vector3().crossVectors(normal, right).normalize();
    
    // Project points onto the plane
    const projectedPoints = points.map(point => {
      const v = new THREE.Vector3().subVectors(point, origin);
      return new THREE.Vector2(
        v.dot(right),
        v.dot(forward)
      );
    });
    
    // Create shape from projected points
    shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
    for (let i = 1; i < projectedPoints.length; i++) {
      shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
    }
    
    // Close the shape if not already closed
    if (!projectedPoints[0].equals(projectedPoints[projectedPoints.length - 1])) {
      shape.closePath();
    }
    
    // Create fill material (semi-transparent white)
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,  // Pure white
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,     // 90% opacity
      depthWrite: true
    });
    
    // Create fill mesh
    const fillGeometry = new THREE.ShapeGeometry(shape);
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    
    // Position and orient the mesh in 3D space
    const center = new THREE.Vector3();
    points.forEach(point => center.add(point));
    center.divideScalar(points.length);
    
    // Create a matrix to transform from 2D plane to 3D space
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(right, forward, normal);
    matrix.setPosition(center);
    
    // Apply the transformation
    fillMesh.applyMatrix4(matrix);
    
    // Create border using the actual 3D points
    const borderGeometry = new THREE.BufferGeometry();
    const borderPoints = [];
    
    // Add all points for the border
    for (let i = 0; i <= points.length; i++) {
      const point = points[i % points.length];
      // Offset slightly along the normal to prevent z-fighting
      const offsetPoint = point.clone().add(normal.clone().multiplyScalar(0.001));
      borderPoints.push(offsetPoint);
    }
    
    borderGeometry.setFromPoints(borderPoints);
    
    // Create border line with higher render order
    const borderMaterial = new THREE.LineBasicMaterial({ 
      color: 0xcccccc,  // Light gray border
      linewidth: 1.5,
      transparent: false,
      opacity: 1.0
    });
    
    const border = new THREE.LineLoop(borderGeometry, borderMaterial);
    border.renderOrder = 2; // Ensure border is rendered on top
    
    // Add both meshes to the group
    group.add(fillMesh);
    group.add(border);
    
    // Ensure the entire group is flat and properly positioned
    group.position.y = 0;
    group.updateMatrix();
    
    return group as unknown as THREE.Mesh;
  }

  /**
   * Menangani klik ganda mouse. Ini akan menyelesaikan polyline, membuat mesh 3D darinya,
   * dan mereset alat gambar.
   */
  private handleDoubleClick = () => {
    if (this.isDrawing && this.points.length > 1) {
      const mesh = this.createMeshFromPoints(this.points);
      
      if (mesh) {
        this.scene.add(mesh);
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(mesh);
        this.historyIndex++;
      }
      
      // Hapus dan buang polyline yang digunakan untuk membuat mesh.
      if (this.currentLine) {
        this.scene.remove(this.currentLine);
        this.currentLine.geometry.dispose();
        (this.currentLine.material as THREE.Material).dispose();
      }
      
      this.resetDrawing();
    }
  };

  /**
   * Event listener untuk event 'mousedown'. Mendeteksi antara klik tunggal dan ganda.
   * @param event Objek MouseEvent.
   */
  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;

    const point = this.getIntersectionPoint(event);
    if (!point) return;

    this.clickCount++;
    
    if (this.clickCount === 1) {
      this.doubleClickTimer = window.setTimeout(() => {
        if (this.clickCount === 1) {
          this.handleSingleClick(point);
        }
        this.clickCount = 0;
      }, 250) as unknown as number;
    } else if (this.clickCount === 2) {
      if (this.doubleClickTimer) {
        clearTimeout(this.doubleClickTimer);
      }
      this.handleDoubleClick();
      this.clickCount = 0;
    }
  };

  /**
   * Event listener untuk event 'mousemove'. Memperbarui garis pratinjau untuk mengikuti kursor.
   * @param event Objek MouseEvent.
   */
  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDrawing) return;
    
    // For the first point, use exact cursor position
    const useFixedDistance = this.points.length === 0;
    const point = this.getIntersectionPoint(event, useFixedDistance);
    if (!point) return;
    
    // Update the preview line
    if (this.tempLines.length > 0) {
      const previewLine = this.tempLines[0];
      const lastPoint = this.points[this.points.length - 1];
      const geometry = previewLine.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      
      // Update the preview line to show from last point to current mouse position
      positions.setXYZ(0, lastPoint.x, lastPoint.y, lastPoint.z);
      positions.setXYZ(1, point.x, point.y, point.z);
      positions.needsUpdate = true;
      
      // Update the main line geometry if we have more than one point
      if (this.currentLine && this.points.length > 1) {
        const mainGeometry = this.currentLine.geometry as THREE.BufferGeometry;
        const mainPositions = mainGeometry.attributes.position as THREE.BufferAttribute;
        
        // Update all points in the main line
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          mainPositions.setXYZ(i, p.x, p.y, p.z);
        }
        
        // Add the current mouse position as the last point
        mainPositions.setXYZ(this.points.length, point.x, point.y, point.z);
        mainPositions.needsUpdate = true;
        
        // Update the draw range to include the new point
        mainGeometry.setDrawRange(0, this.points.length + 1);
      }
    }
  };

  /**
   * Menghapus semua garis sementara dari scene dan membuang geometri serta materialnya untuk membebaskan memori.
   */
  private clearTempLines() {
    this.tempLines.forEach(line => {
      this.scene.remove(line);
      if (line.geometry) line.geometry.dispose();
      if (line.material) {
        if (Array.isArray(line.material)) {
          line.material.forEach(m => m.dispose());
        } else {
          line.material.dispose();
        }
      }
    });
    this.tempLines = [];
  }

  /**
   * Mengatur ulang status menggambar ke nilai awalnya, bersiap untuk operasi menggambar baru.
   */
  private resetDrawing() {
    this.isDrawing = false;
    this.points = [];
    this.currentLine = null;
    this.clearTempLines();
  }

  /**
   * Mengaktifkan LineTool dengan menambahkan semua event listener yang diperlukan.
   * Fungsi ini memanggil disable() terlebih dahulu untuk memastikan tidak ada listener duplikat.
   */
  public enable() {
    this.disable();
    window.addEventListener('keydown', this.handleKeyDown);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('dblclick', this.handleDoubleClick);
  }

  /**
   * Menonaktifkan LineTool dengan menghapus semua event listener dan mereset status.
   */
  public disable() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('dblclick', this.handleDoubleClick);
    
    if (this.doubleClickTimer) {
      clearTimeout(this.doubleClickTimer);
      this.doubleClickTimer = null;
    }
    
    this.resetDrawing();
  }

  /**
   * Membatalkan aksi menggambar terakhir dengan menghapus mesh terakhir yang dibuat dari scene.
   * @returns True jika sebuah aksi dibatalkan, false jika tidak.
   */
  public undo() {
    if (this.historyIndex >= 0) {
      const objectToUndo = this.history[this.historyIndex];
      this.scene.remove(objectToUndo);
      this.historyIndex--;
      return true;
    }
    return false;
  }

  /**
   * Mengulangi aksi terakhir yang dibatalkan dengan menambahkan kembali mesh ke scene.
   * @returns True jika sebuah aksi diulangi, false jika tidak.
   */
  public redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const objectToRedo = this.history[this.historyIndex];
      this.scene.add(objectToRedo);
      return true;
    }
    return false;
  }
}
