/*
  Digital Snow Globe 🚀❄️
  Interactive SVG shapes with physics-based motion, collisions, and mouse repulsion—like shaking a snow globe in your browser!

  Version: 1.0
  Year: 2025  
  By James Neufeld
*/

$(function () {
  // --- CONFIGURATION - MODIFY THESE VALUES TO CUSTOMIZE ---
  const COLORS = {
    SHAPES: ["white"],
    BACKGROUND: ["transparent"],
  };

  const PHYSICS = {
    // How quickly shapes slow down over time (0.9 = fast slowdown, 0.999 = very slow slowdown)
    FRICTION: 0.995,

    // How far away the mouse cursor affects shapes (in pixels)
    REPULSION_RADIUS: 150,

    // How strongly shapes are pushed away from the mouse (higher = stronger push)
    REPULSION_FORCE: 3,

    // How much energy shapes keep when bouncing off walls (1.0 = same energy, 1.1 = 10% more energy)
    BOUNCE_ENERGY: 1.05,

    // How fast shapes move when starting (higher = faster initial movement)
    INITIAL_VELOCITY: 4,

    // Total number of shapes on screen
    PARTICLE_COUNT: 35,

    // Smallest shape size in pixels
    MIN_SIZE: 25,

    // Largest shape size in pixels
    MAX_SIZE: 55,
  };

  // Get the container element and its dimensions
  const $container = $("#container");
  let containerWidth = $container.width();
  let containerHeight = $container.height();

  // --- SVG SHAPES LIBRARY ---
  // Delete or modify the shapes you don't want to use
  // Add your own SVG paths by copying from design tools like Illustrator
  const shapes = [
    '<path d="M12 2l2.5 6.5L21 9l-5.5 4.5L18 20l-6-3.5L6 20l2-6.5L3 9l6.5-.5L12 2z" stroke="white" stroke-width="2"/>', // Star
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="white" stroke-width="2"/>', // Heart
    '<path d="M12 2l6 6-6 6-6-6 6-6z" stroke="white" stroke-width="2"/>', // Diamond
    '<path d="M12 2l10 16H2L12 2z" stroke="white" stroke-width="2"/>', // Triangle
    '<circle cx="12" cy="12" r="10"/>', // Circle
    '<rect x="4" y="4" width="16" height="16" stroke="white" stroke-width="2"/>', // Square
    '<path d="M12 2l10 10-10 10-10-10z"stroke="white" stroke-width="2"/>', // Starburst
    '<path d="M12 2L12 22M2 12L22 12M4.5 4.5L19.5 19.5M19.5 4.5L4.5 19.5" stroke="white" stroke-width="2"/>', // Heavy Asterisk
    '<path d="M12 2L12 22M2 12L22 12M4 4L20 20M20 4L4 20" stroke="white" stroke-width="2"/>', // Full Asterisk
    '<path d="M12 2L12 22M2 12L22 12" stroke="white" stroke-width="1.5"/>', // Light Asterisk
    '<path d="M12 2l6 10-6 10-6-10z" stroke="white" stroke-width="2"/>', // Tall Triangle
  ];

  // --- UTILITY FUNCTIONS ---
  const utils = {
    // Generate random position within container bounds
    randomPosition: (size) => ({
      x: Math.random() * (containerWidth - 2 * size) + size,
      y: Math.random() * (containerHeight - 2 * size) + size,
    }),

    // Generate random size between min and max
    randomSize: () =>
      PHYSICS.MIN_SIZE + Math.random() * (PHYSICS.MAX_SIZE - PHYSICS.MIN_SIZE),

    // Pick random color from palette
    randomColor: () =>
      COLORS.SHAPES[Math.floor(Math.random() * COLORS.SHAPES.length)],

    // Generate random initial velocity
    randomVelocity: () => ({
      x: (Math.random() - 0.5) * PHYSICS.INITIAL_VELOCITY,
      y: (Math.random() - 0.5) * PHYSICS.INITIAL_VELOCITY,
    }),

    // Calculate distance between two points
    distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),

    // Rotate a vector by given angle
    rotateVector: (vector, angle) => ({
      x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
      y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
    }),

    // Keep value within min/max bounds
    clamp: (value, min, max) => Math.min(Math.max(min, value), max),
  };

  // --- GLOBAL STATE ---
  const mouse = { x: undefined, y: undefined };
  const particles = [];

  // --- EVENT HANDLERS ---
  const setupEventListeners = () => {
    // Track mouse position relative to container
    $(document).on("mousemove", (e) => {
      const offset = $container.offset();
      mouse.x = e.pageX - offset.left;
      mouse.y = e.pageY - offset.top;
    });

    // Update container dimensions on window resize
    $(window).on("resize", () => {
      containerWidth = $container.width();
      containerHeight = $container.height();
      particles.forEach((particle) => particle.clamp());
    });
  };

  // --- PARTICLE PHYSICS CLASS ---
  class Particle {
    constructor($element, x, y, size, fillColor) {
      this.$el = $element;
      this.x = x;
      this.y = y;
      this.size = size;
      this.mass = size * 2;
      this.friction = PHYSICS.FRICTION;
      this.velocity = utils.randomVelocity();

      this.applyColor(fillColor);
    }

    // Apply color to all SVG elements
    applyColor(fillColor) {
      this.$el.find("svg path, svg circle, svg rect").attr("fill", fillColor);
    }

    // Keep particle within container boundaries
    clamp() {
      this.x = utils.clamp(this.x, this.size, containerWidth - this.size);
      this.y = utils.clamp(this.y, this.size, containerHeight - this.size);
    }

    // Apply force to change velocity
    applyForce(forceX, forceY) {
      this.velocity.x += forceX;
      this.velocity.y += forceY;
    }

    // Handle bouncing off container walls
    handleWallCollisions() {
      // Left wall
      if (this.x - this.size <= 0) {
        this.velocity.x = Math.abs(this.velocity.x) * PHYSICS.BOUNCE_ENERGY;
        this.x = this.size;
      }
      // Right wall
      if (this.x + this.size >= containerWidth) {
        this.velocity.x = -Math.abs(this.velocity.x) * PHYSICS.BOUNCE_ENERGY;
        this.x = containerWidth - this.size;
      }
      // Top wall
      if (this.y - this.size <= 0) {
        this.velocity.y = Math.abs(this.velocity.y) * PHYSICS.BOUNCE_ENERGY;
        this.y = this.size;
      }
      // Bottom wall
      if (this.y + this.size >= containerHeight) {
        this.velocity.y = -Math.abs(this.velocity.y) * PHYSICS.BOUNCE_ENERGY;
        this.y = containerHeight - this.size;
      }
    }

    // Apply repulsion force from mouse cursor
    repelFromMouse() {
      if (mouse.x === undefined) return;

      // Calculate distance to mouse
      const distance = utils.distance(this.x, this.y, mouse.x, mouse.y);

      // Only apply repulsion if mouse is within range
      if (distance < PHYSICS.REPULSION_RADIUS && distance > 0) {
        // Calculate force strength based on distance
        const force =
          ((PHYSICS.REPULSION_RADIUS - distance) / PHYSICS.REPULSION_RADIUS) *
          PHYSICS.REPULSION_FORCE;
        // Calculate direction from mouse to particle
        const angle = Math.atan2(this.y - mouse.y, this.x - mouse.x);
        // Apply force in the calculated direction
        this.applyForce(Math.cos(angle) * force, Math.sin(angle) * force);
      }
    }

    // Handle collision with another particle
    handleCollision(otherParticle) {
      // Calculate distance between particles
      const distance = utils.distance(
        this.x,
        this.y,
        otherParticle.x,
        otherParticle.y
      );

      // Only collide if particles are touching
      if (distance <= 0 || distance >= this.size + otherParticle.size) return;

      // Calculate collision angle
      const angle = -Math.atan2(
        otherParticle.y - this.y,
        otherParticle.x - this.x
      );

      // Rotate velocities to simplify collision calculation
      const velocity1 = utils.rotateVector(this.velocity, angle);
      const velocity2 = utils.rotateVector(otherParticle.velocity, angle);

      // Calculate new velocities after collision
      const newVelocity1 = this.calculateCollisionVelocity(
        velocity1,
        velocity2,
        this.mass,
        otherParticle.mass
      );
      const newVelocity2 = this.calculateCollisionVelocity(
        velocity2,
        velocity1,
        otherParticle.mass,
        this.mass
      );

      // Rotate velocities back to original orientation
      this.velocity = utils.rotateVector(newVelocity1, -angle);
      otherParticle.velocity = utils.rotateVector(newVelocity2, -angle);
    }

    // Calculate new velocity after collision using physics equations
    calculateCollisionVelocity(v1, v2, m1, m2) {
      return {
        x: (v1.x * (m1 - m2) + v2.x * 2 * m2) / (m1 + m2),
        y: v1.y,
      };
    }

    // Update position based on velocity
    updatePosition() {
      // Apply friction to gradually slow down
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
      // Update position based on velocity
      this.x += this.velocity.x;
      this.y += this.velocity.y;
    }

    // Update DOM element to match physics position
    updateDOM() {
      this.$el.css({
        left: this.x - this.size,
        top: this.y - this.size,
        width: this.size * 2,
        height: this.size * 2,
      });
    }

    // Main update method called each animation frame
    update(allParticles) {
      // Apply mouse repulsion
      this.repelFromMouse();

      // Check collisions with all other particles
      allParticles.forEach((particle) => {
        if (particle !== this) this.handleCollision(particle);
      });

      // Update position and handle wall collisions
      this.updatePosition();
      this.handleWallCollisions();
      this.updateDOM();
    }
  }

  // --- PARTICLE CREATION ---
  const createParticleElement = (position, size, shapeIndex) => {
    const $element = $("<div>")
      .addClass("svg-box")
      .css({
        left: position.x - size,
        top: position.y - size,
        width: size * 2,
        height: size * 2,
      });

    const svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svgElement.setAttribute("viewBox", "0 0 24 24");
    svgElement.innerHTML = shapes[shapeIndex % shapes.length];

    $element[0].appendChild(svgElement);
    return $element;
  };

  const findValidPosition = (size, existingParticles) => {
    let position = utils.randomPosition(size);
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    // Try to find a non-overlapping position
    while (attempts < MAX_ATTEMPTS) {
      const isValid = !existingParticles.some((particle) => {
        const distance = utils.distance(
          position.x,
          position.y,
          particle.x,
          particle.y
        );
        return distance < size + particle.size;
      });

      if (isValid) return position;

      position = utils.randomPosition(size);
      attempts++;
    }

    return position; // Return last attempt if max attempts reached
  };

  const createParticles = () => {
    for (let i = 0; i < PHYSICS.PARTICLE_COUNT; i++) {
      const size = utils.randomSize();
      const position = findValidPosition(size, particles);
      const $element = createParticleElement(position, size, i);
      const color = utils.randomColor();

      const particle = new Particle(
        $element,
        position.x,
        position.y,
        size,
        color
      );
      particles.push(particle);
      $container.append($element);
    }
  };

  // --- INITIALIZATION AND ANIMATION ---
  const init = () => {
    $container.empty();
    particles.length = 0;
    containerWidth = $container.width();
    containerHeight = $container.height();

    // Set background color from configuration
    $container.css("background", COLORS.BACKGROUND);

    setupEventListeners();
    createParticles();
  };

  const animate = () => {
    requestAnimationFrame(animate);
    particles.forEach((particle) => particle.update(particles));
  };

  // Start the application
  init();
  animate();
});
