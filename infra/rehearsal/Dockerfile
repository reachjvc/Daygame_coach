# The practice server's hardware: QEMU with KVM, inside a container, so the
# rehearsal needs no sudo. The container gets /dev/kvm with --device; the VM
# itself is the real Ubuntu 24.04 cloud image (infra/rehearsal/run.sh).
# Plans/caddy-deploy-and-cicd.md, Phase 5b step 3.

FROM ubuntu:24.04@sha256:534baea6a22c03a63003dbc8dbe78fe34bc0d7e595d9a9dc9834884ff530eb55

# A rehearsal tool, rebuilt from the pinned base: Ubuntu drops old package
# versions from its archive, so pinning them would only break the build.
# hadolint ignore=DL3008
RUN apt-get update \
 && apt-get install -y --no-install-recommends qemu-system-x86 qemu-utils ipxe-qemu genisoimage \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /vm
