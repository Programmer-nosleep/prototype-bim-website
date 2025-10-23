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
  
  /** Kontrol kamera untuk menonaktifkan/mengaktifkan saat menggambar */
  private controls?: {
    enabled: boolean;
  };
  
  /** Menyimpan status awal kontrol kamera */
  private originalControlsEnabled: boolean = true;
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
  private getIntersectionPoint(event: MouseEvent): THREE.Vector3 | null {
    const mouse = new THREE.Vector2();
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Create a plane that faces the camera for more natural 3D drawing
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    const plane = new THREE.Plane();
    
    // If we're not drawing yet, use a plane at the camera's look-at point
    if (!this.isDrawing) {
      const target = new THREE.Vector3(0, 0, 0);
      this.camera.getWorldPosition(target);
      plane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        target
      );
    } else {
      // If we're already drawing, use a plane perpendicular to the camera's view
      // and passing through the last point
      const lastPoint = this.points[this.points.length - 1];
      plane.setFromNormalAndCoplanarPoint(
        cameraDirection,
        lastPoint
      );
    }
    
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    
    // Fallback to ground plane if no intersection with view plane
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
      return intersection;
    }
    
    return null;
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
    if (points.length < 2) return null;

    // Create a group to hold both the fill and the border
    const group = new THREE.Group();
    
    // Create a 2D shape from the points
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    
    // Close the shape if not already closed
    if (!points[0].equals(points[points.length - 1])) {
      shape.lineTo(points[0].x, points[0].z);
    }
    
    // Create fill material (semi-transparent white)
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,  // Pure white
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,     // 90% opacity
      depthWrite: false
    });
    
    // Create fill mesh (completely flat 2D plane)
    const fillGeometry = new THREE.ShapeGeometry(shape);
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.rotation.x = -Math.PI / 2; // Rotate to be flat on XZ plane
    fillMesh.position.y = 0.001; // Slightly above ground to prevent z-fighting
    
    // Create border using the actual shape points
    const borderGeometry = new THREE.BufferGeometry();
    const borderPoints = [];
    
    // Add all points for the border
    for (let i = 0; i <= points.length; i++) {
      const point = points[i % points.length];
      borderPoints.push(new THREE.Vector3(point.x, 0.002, point.z));
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
    
    const point = this.getIntersectionPoint(event);
    if (!point || this.points.length === 0) return;
    
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
