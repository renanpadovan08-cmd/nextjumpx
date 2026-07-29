import 'package:flutter/material.dart';

class NextJumpXLandingScreen extends StatelessWidget {
  const NextJumpXLandingScreen({super.key, required this.onZenBarber});

  final VoidCallback onZenBarber;

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xff03130e),
        body: Stack(
          children: [
            Positioned.fill(
              child: Image.asset(
                'assets/images/nextjumpx-background-clean.png',
                fit: BoxFit.cover,
              ),
            ),
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0x66010d09),
                      Color(0x22010d09),
                      Color(0xaa010d09),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 830),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(
                      MediaQuery.sizeOf(context).width < 500 ? 16 : 24,
                      MediaQuery.sizeOf(context).width < 500 ? 24 : 36,
                      MediaQuery.sizeOf(context).width < 500 ? 16 : 24,
                      30,
                    ),
                    child: Column(
                      children: [
                        Image.asset(
                          'assets/images/nextjumpx-logo-transparent.png',
                          width: 112,
                          height: 90,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'ECOSSISTEMA DE SOFTWARES',
                          style: TextStyle(
                            color: Color(0xffe8bd52),
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                          ),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(
                          width: double.infinity,
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: [
                                Text(
                                  'NextJump',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 62,
                                    fontWeight: FontWeight.w800,
                                    height: .95,
                                  ),
                                ),
                                Text(
                                  'X',
                                  style: TextStyle(
                                    color: Color(0xff70df00),
                                    fontSize: 62,
                                    fontWeight: FontWeight.w800,
                                    height: .95,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 30),
                        const Text(
                          'O próximo salto que multiplica resultados.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xff13e682),
                            fontSize: 27,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 13),
                        const Text(
                          'Criamos soluções inteligentes para transformar negócios.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 50),
                        const Text(
                          'Escolha sua solução',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 28),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final compact = constraints.maxWidth < 700;
                            final cards = [
                              _SolutionCard(
                                available: true,
                                title: 'ZenBarber',
                                subtitle: 'Gestão inteligente para barbearias',
                                description:
                                    'O barbeiro corta.\nO ZenBarber administra.',
                                image: 'assets/images/zenbarber.jpeg',
                                onTap: onZenBarber,
                              ),
                              const _SolutionCard(
                                available: false,
                                title: 'ZenBeauty',
                                subtitle: 'Gestão inteligente para salões',
                                description:
                                    'Beleza, equilíbrio e controle em uma única plataforma.',
                                image: 'assets/images/zenbeauty.png',
                              ),
                            ];
                            return compact
                                ? Column(
                                    children: [
                                      cards.first,
                                      const SizedBox(height: 20),
                                      cards.last,
                                    ],
                                  )
                                : Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(child: cards.first),
                                      const SizedBox(width: 28),
                                      Expanded(child: cards.last),
                                    ],
                                  );
                          },
                        ),
                        const SizedBox(height: 32),
                        const Text(
                          'NextJumpX © 2026',
                          style: TextStyle(
                            color: Color(0xffb3c5ba),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}

class _SolutionCard extends StatelessWidget {
  const _SolutionCard({
    required this.available,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.image,
    this.onTap,
  });

  final bool available;
  final String title;
  final String subtitle;
  final String description;
  final String image;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(22),
          child: Container(
            padding: const EdgeInsets.fromLTRB(26, 22, 26, 25),
            decoration: BoxDecoration(
              color: const Color(0xb80a2e22),
              border: Border.all(
                color: available
                    ? const Color(0xff357b5d)
                    : const Color(0xff49655c),
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x77000000),
                  blurRadius: 28,
                  offset: Offset(0, 16),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    available ? '• Disponível agora' : '• Em breve',
                    style: TextStyle(
                      color: available
                          ? const Color(0xff13e682)
                          : const Color(0xffe8bd52),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.asset(image,
                      width: 190, height: 190, fit: BoxFit.cover),
                ),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xffd6e8dc),
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 11),
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xffc4d4ca),
                    fontSize: 15,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  available ? 'Acessar plataforma  →' : 'Em desenvolvimento',
                  style: TextStyle(
                    color: available
                        ? const Color(0xff13e682)
                        : const Color(0xffe8bd52),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
