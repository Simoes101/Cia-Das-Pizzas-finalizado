(function(){
    // Canvas background particles
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
    function resize(){
        w = innerWidth; h = innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    window.addEventListener('resize', resize);
    resize();

    // particle config (cinzas / poeira)
    const colors = ['rgba(210,210,210,0.08)','rgba(170,170,170,0.06)','rgba(130,130,130,0.05)'];
    const particles = [];
    const PARTICLE_COUNT = Math.max(80, Math.floor((w*h)/6000));

    function rand(min, max){ return Math.random()*(max-min)+min; }

    function createParticle(){
        return {
            x: rand(-0.2*w, 1.2*w),
            y: rand(-0.2*h, 1.2*h),
            r: rand(0.6, 3.2),
            vx: rand(-0.05, 0.05),
            vy: rand(0.01, 0.12),
            color: colors[Math.floor(Math.random()*colors.length)],
            alpha: rand(0.08, 0.22),
            swing: rand(0.001, 0.004),
            baseX: 0
        };
    }

    function init(){
        particles.length = 0;
        for(let i=0;i<PARTICLE_COUNT;i++) particles.push(createParticle());
    }
    init();

    let last = performance.now();
    function draw(now){
        const dt = Math.min(40, now - last) / 16.666;
        last = now;
        ctx.clearRect(0,0,w,h);

        for(let p of particles){
            p.x += p.vx * dt * 10;
            p.y += p.vy * dt * 10;
            p.baseX = (p.baseX || 0) + p.swing * dt * 200;
            const ox = p.x + Math.sin(p.baseX) * (p.r*0.25);

            // Draw simple soft dot for dust/ash
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = p.color.replace(/\)$/, ', '+p.alpha+')');
            ctx.beginPath();
            ctx.arc(ox, p.y, p.r, 0, Math.PI*2);
            ctx.fill();

            // wrap particles
            if(p.y + p.r < -h*0.2) p.y = h + p.r + rand(0, h*0.2);
            if(p.x - p.r > w*1.2) p.x = -p.r - rand(0, w*0.2);
            if(p.x + p.r < -w*0.2) p.x = w + p.r + rand(0, w*0.2);
        }

        requestAnimationFrame(draw);
    }

    // restart on resize to adjust count
    window.addEventListener('resize', ()=>{
        const newCount = Math.max(10, Math.floor((innerWidth*innerHeight)/80000));
        while(particles.length < newCount) particles.push(createParticle());
        while(particles.length > newCount) particles.pop();
    });

    requestAnimationFrame(draw);
})();
